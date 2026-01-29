import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { BuildStatus, DeploymentStatus } from '@kubidu/shared';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('build')
    private readonly buildQueue: Queue,
  ) {}

  async saveWebhookEvent(
    serviceId: string,
    provider: string,
    eventType: string,
    payload: any,
    signature: string,
  ) {
    const webhookEvent = await this.prisma.webhookEvent.create({
      data: {
        serviceId,
        provider,
        eventType,
        payload,
        signature,
        processed: false,
      },
    });

    this.logger.log(`Saved webhook event: ${webhookEvent.id}`);
    return webhookEvent;
  }

  async findServiceByRepositoryUrl(repositoryUrl: string) {
    const normalizedUrl = this.normalizeRepositoryUrl(repositoryUrl);
    const withGit = normalizedUrl + '.git';
    const withoutGit = normalizedUrl.replace('.git', '');

    // Use case-insensitive matching since GitHub URLs are case-insensitive
    // but may be stored with original casing
    const service = await this.prisma.$queryRaw`
      SELECT s.* FROM services s
      WHERE LOWER(s.repository_url) IN (${normalizedUrl}, ${withGit}, ${withoutGit})
      LIMIT 1
    ` as any[];

    if (!service || service.length === 0) return null;

    // Re-fetch with relations using the found service ID
    return this.prisma.service.findUnique({
      where: { id: service[0].id },
      include: {
        project: true,
        githubInstallation: true,
      },
    });
  }

  async enqueueBuild(
    service: any,
    commitSha: string,
    commitMessage: string,
    branch: string,
    author: string,
  ): Promise<void> {
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Check if auto-deploy is enabled
    if (!service.autoDeploy) {
      this.logger.log(`Auto-deploy disabled for service: ${service.id}`);
      return;
    }

    // Check if the branch matches
    if (service.repositoryBranch !== branch) {
      this.logger.log(
        `Branch mismatch for service ${service.id}: expected ${service.repositoryBranch}, got ${branch}`,
      );
      return;
    }

    // Create deployment record
    const deployment = await this.prisma.deployment.create({
      data: {
        serviceId: service.id,
        name: `${service.name}-${Date.now()}`,
        status: DeploymentStatus.PENDING,
        gitCommitSha: commitSha,
        gitCommitMessage: commitMessage,
        gitAuthor: author,
      },
    });

    this.logger.log(`Created deployment: ${deployment.id}`);

    // Create build queue entry
    const buildQueueEntry = await this.prisma.buildQueue.create({
      data: {
        serviceId: service.id,
        deploymentId: deployment.id,
        status: BuildStatus.QUEUED,
      },
    });

    this.logger.log(`Created build queue entry: ${buildQueueEntry.id}`);

    // Add to Bull queue for processing
    await this.buildQueue.add(
      'build-image',
      {
        buildQueueId: buildQueueEntry.id,
        projectId: service.projectId,
        deploymentId: deployment.id,
        repositoryUrl: service.repositoryUrl,
        branch,
        commitSha,
        commitMessage,
        author,
        githubInstallationId: service.githubInstallation?.installationId,
        githubRepoFullName: service.githubRepoFullName,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    this.logger.log(`Enqueued build job for deployment: ${deployment.id}`);
  }

  async markWebhookProcessed(webhookEventId: string, error?: string): Promise<void> {
    await this.prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        processed: true,
        processedAt: new Date(),
        error: error || null,
      },
    });
  }

  private normalizeRepositoryUrl(url: string): string {
    return url
      .replace(/\.git$/, '')
      .replace(/\/$/, '')
      .toLowerCase()
      .trim();
  }
}
