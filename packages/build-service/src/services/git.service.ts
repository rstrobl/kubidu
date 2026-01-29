import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);
  private readonly workdir: string;

  constructor(private readonly configService: ConfigService) {
    this.workdir = this.configService.get<string>('build.workdir');

    // Ensure workdir exists
    if (!fs.existsSync(this.workdir)) {
      fs.mkdirSync(this.workdir, { recursive: true });
      this.logger.log(`Created build workdir: ${this.workdir}`);
    }
  }

  async cloneRepository(
    repositoryUrl: string,
    branch: string,
    commitSha?: string,
    authenticatedUrl?: string,
  ): Promise<string> {
    const repoName = this.extractRepoName(repositoryUrl);
    const timestamp = Date.now();
    const clonePath = path.join(this.workdir, `${repoName}-${timestamp}`);

    this.logger.log(`Cloning ${repositoryUrl} (${branch}) to ${clonePath}`);

    try {
      const git: SimpleGit = simpleGit();
      const cloneUrl = authenticatedUrl || repositoryUrl;

      // Clone the repository
      await git.clone(cloneUrl, clonePath, [
        '--branch',
        branch,
        '--depth',
        '1', // Shallow clone for faster cloning
      ]);

      // If specific commit SHA is provided, checkout that commit
      if (commitSha) {
        const repoGit = simpleGit(clonePath);

        // Unshallow if needed to get specific commit
        await repoGit.fetch(['--unshallow']);
        await repoGit.checkout(commitSha);

        this.logger.log(`Checked out commit: ${commitSha}`);
      }

      this.logger.log(`Successfully cloned repository to: ${clonePath}`);
      return clonePath;
    } catch (error) {
      this.logger.error(`Failed to clone repository: ${error.message}`);

      // Clean up on failure
      if (fs.existsSync(clonePath)) {
        await this.cleanup(clonePath);
      }

      throw error;
    }
  }

  async cleanup(buildPath: string): Promise<void> {
    try {
      if (fs.existsSync(buildPath)) {
        fs.rmSync(buildPath, { recursive: true, force: true });
        this.logger.log(`Cleaned up build directory: ${buildPath}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup build directory: ${error.message}`);
    }
  }

  private extractRepoName(repositoryUrl: string): string {
    // Extract repo name from URL
    // e.g., https://github.com/user/repo.git -> repo
    const parts = repositoryUrl.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart.replace('.git', '');
  }

  async getCommitInfo(buildPath: string, commitSha: string): Promise<{
    message: string;
    author: string;
    date: Date;
  }> {
    try {
      const git = simpleGit(buildPath);
      const log = await git.log(['-1', commitSha]);

      return {
        message: log.latest.message,
        author: log.latest.author_name,
        date: new Date(log.latest.date),
      };
    } catch (error) {
      this.logger.warn(`Failed to get commit info: ${error.message}`);
      return {
        message: 'Unknown',
        author: 'Unknown',
        date: new Date(),
      };
    }
  }
}
