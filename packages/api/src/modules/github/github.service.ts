import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GitHubAppService } from './github-app.service';
import { ConfigService } from '@nestjs/config';
import { GitHubRepo, GitHubBranch } from '@kubidu/shared';

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gitHubApp: GitHubAppService,
    private readonly configService: ConfigService,
  ) {}

  getInstallUrl(userId: string): string {
    const appName = this.configService.get<string>('github.appName');
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64url');
    return `https://github.com/apps/${appName}/installations/new?state=${state}`;
  }

  async handleInstallationCallback(
    userId: string,
    installationId: number,
    setupAction: string,
  ): Promise<any> {
    this.logger.log(
      `Handling installation callback: installationId=${installationId}, action=${setupAction}`,
    );

    if (setupAction === 'install' || setupAction === 'update') {
      const details = await this.gitHubApp.getInstallationDetails(installationId);

      const installation = await this.prisma.gitHubInstallation.upsert({
        where: { installationId },
        create: {
          userId,
          installationId,
          accountLogin: details.account.login,
          accountType: details.account.type,
          accountAvatarUrl: details.account.avatar_url,
          permissions: details.permissions,
        },
        update: {
          accountLogin: details.account.login,
          accountType: details.account.type,
          accountAvatarUrl: details.account.avatar_url,
          permissions: details.permissions,
          uninstalledAt: null,
        },
      });

      this.logger.log(
        `Stored GitHub installation: ${installation.id} for account ${details.account.login}`,
      );
      return installation;
    }

    return null;
  }

  async getUserInstallations(userId: string) {
    return this.prisma.gitHubInstallation.findMany({
      where: {
        userId,
        uninstalledAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeInstallation(userId: string, installationDbId: string) {
    const installation = await this.prisma.gitHubInstallation.findUnique({
      where: { id: installationDbId },
    });

    if (!installation) {
      throw new NotFoundException('Installation not found');
    }

    if (installation.userId !== userId) {
      throw new ForbiddenException('You do not own this installation');
    }

    await this.prisma.gitHubInstallation.update({
      where: { id: installationDbId },
      data: { uninstalledAt: new Date() },
    });

    this.logger.log(`Marked installation ${installationDbId} as uninstalled`);
  }

  async listRepos(
    userId: string,
    installationDbId: string,
    page = 1,
    search?: string,
  ): Promise<{ repos: GitHubRepo[]; totalCount: number }> {
    const installation = await this.verifyInstallationOwnership(
      userId,
      installationDbId,
    );

    const { repositories, totalCount } =
      await this.gitHubApp.listInstallationRepos(
        installation.installationId,
        page,
        100,
      );

    let repos: GitHubRepo[] = repositories.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      description: repo.description,
      language: repo.language,
      defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at,
      htmlUrl: repo.html_url,
    }));

    if (search) {
      const lowerSearch = search.toLowerCase();
      repos = repos.filter(
        (r) =>
          r.name.toLowerCase().includes(lowerSearch) ||
          r.fullName.toLowerCase().includes(lowerSearch),
      );
    }

    return { repos, totalCount };
  }

  async listBranches(
    userId: string,
    installationDbId: string,
    owner: string,
    repo: string,
  ): Promise<GitHubBranch[]> {
    const installation = await this.verifyInstallationOwnership(
      userId,
      installationDbId,
    );

    const [branches, repoDetails] = await Promise.all([
      this.gitHubApp.listBranches(installation.installationId, owner, repo),
      this.gitHubApp.getRepoDetails(installation.installationId, owner, repo),
    ]);

    return branches.map((b) => ({
      name: b.name,
      isDefault: b.name === repoDetails.default_branch,
      commitSha: b.commit.sha,
    }));
  }

  private async verifyInstallationOwnership(
    userId: string,
    installationDbId: string,
  ) {
    const installation = await this.prisma.gitHubInstallation.findUnique({
      where: { id: installationDbId },
    });

    if (!installation) {
      throw new NotFoundException('Installation not found');
    }

    if (installation.userId !== userId) {
      throw new ForbiddenException('You do not own this installation');
    }

    if (installation.uninstalledAt) {
      throw new NotFoundException('Installation has been removed');
    }

    return installation;
  }
}
