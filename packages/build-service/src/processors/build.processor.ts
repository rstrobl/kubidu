import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { DockerService } from '../services/docker.service';
import { GitService } from '../services/git.service';
import { GitHubAuthService } from '../services/github-auth.service';
import { PrismaService } from '../database/prisma.service';
import { BuildStatus, DeploymentStatus } from '@kubidu/shared';

interface BuildJobData {
  buildQueueId: string;
  projectId: string;
  deploymentId: string;
  repositoryUrl: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  author: string;
  githubInstallationId?: number;
  githubRepoFullName?: string;
}

@Processor('build')
export class BuildProcessor {
  private readonly logger = new Logger(BuildProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dockerService: DockerService,
    private readonly gitService: GitService,
    private readonly gitHubAuthService: GitHubAuthService,
    @InjectQueue('deploy') private readonly deployQueue: Queue,
  ) {}

  @Process('build-image')
  async handleBuildImage(job: Job<BuildJobData>): Promise<void> {
    const {
      buildQueueId,
      projectId,
      deploymentId,
      repositoryUrl,
      branch,
      commitSha,
      commitMessage,
      author,
    } = job.data;

    this.logger.log(`Starting build job ${job.id} for deployment ${deploymentId}`);

    let buildPath: string | null = null;
    const buildStartTime = new Date();

    try {
      // Update build queue status
      await this.updateBuildQueueStatus(buildQueueId, BuildStatus.BUILDING);
      await this.updateDeploymentStatus(deploymentId, DeploymentStatus.BUILDING);

      // Generate authenticated clone URL for GitHub App installations
      let authenticatedUrl: string | undefined;
      if (job.data.githubInstallationId && job.data.githubRepoFullName && this.gitHubAuthService.isConfigured()) {
        this.logger.log(`Generating authenticated URL for GitHub App installation ${job.data.githubInstallationId}`);
        authenticatedUrl = await this.gitHubAuthService.getAuthenticatedCloneUrl(
          job.data.githubInstallationId,
          job.data.githubRepoFullName,
        );
      }

      // Clone the repository
      this.logger.log(`Cloning repository: ${repositoryUrl}`);
      buildPath = await this.gitService.cloneRepository(repositoryUrl, branch, commitSha, authenticatedUrl);

      await this.updateBuildProgress(deploymentId, 'Repository cloned successfully');

      // Build the Docker image
      const imageName = `${projectId.toLowerCase()}`;
      const imageTag = commitSha.substring(0, 7);

      this.logger.log(`Building Docker image: ${imageName}:${imageTag}`);

      const { imageId, logs } = await this.dockerService.buildImage(
        buildPath,
        imageName,
        imageTag,
      );

      await this.updateBuildProgress(deploymentId, `Image built: ${imageId}`);
      await this.updateDeploymentLogs(deploymentId, logs);

      // Push image to registry
      this.logger.log(`Pushing image to registry`);
      await this.dockerService.pushImage(imageName, imageTag);

      await this.updateBuildProgress(deploymentId, 'Image pushed to registry');

      // Update deployment with image info
      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          imageUrl: `${imageName}:${imageTag}`,
          imageTag,
          status: DeploymentStatus.DEPLOYING,
        },
      });

      // Calculate build duration
      const buildEndTime = new Date();
      const buildDurationSeconds = Math.floor(
        (buildEndTime.getTime() - buildStartTime.getTime()) / 1000,
      );

      // Mark build as completed
      await this.prisma.buildQueue.update({
        where: { id: buildQueueId },
        data: {
          status: BuildStatus.COMPLETED,
          buildEndTime,
          buildDurationSeconds,
        },
      });

      this.logger.log(`Build job ${job.id} completed successfully`);

      // Enqueue deployment job
      const deployment = await this.prisma.deployment.findUnique({
        where: { id: deploymentId },
        include: { service: { include: { project: true } } },
      });

      if (deployment && deployment.service?.project) {
        await this.deployQueue.add({
          deploymentId,
          projectId,
          userId: deployment.service.project.userId,
        });
        this.logger.log(`Enqueued deploy job for deployment ${deploymentId}`);
      }

      // Clean up build directory
      if (buildPath) {
        await this.gitService.cleanup(buildPath);
      }

      // Optionally clean up Docker image from build server
      // await this.dockerService.removeImage(imageName, imageTag);
    } catch (error) {
      this.logger.error(`Build job ${job.id} failed: ${error.message}`, error.stack);

      // Calculate build duration
      const buildEndTime = new Date();
      const buildDurationSeconds = Math.floor(
        (buildEndTime.getTime() - buildStartTime.getTime()) / 1000,
      );

      // Update statuses to failed
      await this.prisma.buildQueue.update({
        where: { id: buildQueueId },
        data: {
          status: BuildStatus.FAILED,
          buildEndTime,
          buildDurationSeconds,
          errorMessage: error.message,
        },
      });

      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: DeploymentStatus.FAILED,
          buildLogs: `Build failed: ${error.message}\n\n${error.stack}`,
        },
      });

      // Clean up on failure
      if (buildPath) {
        await this.gitService.cleanup(buildPath);
      }

      throw error;
    }
  }

  private async updateBuildQueueStatus(
    buildQueueId: string,
    status: BuildStatus,
  ): Promise<void> {
    await this.prisma.buildQueue.update({
      where: { id: buildQueueId },
      data: {
        status,
        buildStartTime: status === BuildStatus.BUILDING ? new Date() : undefined,
      },
    });
  }

  private async updateBuildProgress(deploymentId: string, message: string): Promise<void> {
    this.logger.log(`Build progress: ${message}`);

    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    if (deployment) {
      const currentLogs = deployment.buildLogs || '';
      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          buildLogs: `${currentLogs}\n${new Date().toISOString()}: ${message}`,
        },
      });
    }
  }

  private async updateDeploymentStatus(
    deploymentId: string,
    status: DeploymentStatus,
  ): Promise<void> {
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status },
    });
  }

  private async updateDeploymentLogs(deploymentId: string, logs: string): Promise<void> {
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        buildLogs: logs.substring(0, 100000), // Limit log size
      },
    });
  }
}
