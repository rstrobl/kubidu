import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationCategory } from '@prisma/client';

interface DeploymentNotificationJob {
  workspaceId: string;
  category: 'DEPLOYMENT' | 'BUILD' | 'DOMAIN' | 'SERVICE' | 'WORKSPACE';
  deploymentId: string;
  deploymentName: string;
  deploymentStatus: string;
  serviceId: string;
  serviceName: string;
  projectId: string;
  projectName: string;
  errorMessage?: string;
}

@Processor('notification')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('deployment-status')
  async handleDeploymentStatus(job: Job<DeploymentNotificationJob>) {
    const data = job.data;

    this.logger.log(
      `Processing deployment notification: ${data.deploymentId} status=${data.deploymentStatus}`,
    );

    try {
      // Get all workspace members to notify
      const members = await this.prisma.workspaceMember.findMany({
        where: { workspaceId: data.workspaceId },
        select: { userId: true },
      });

      const userIds = members.map((m) => m.userId);

      if (userIds.length === 0) {
        this.logger.warn(`No workspace members found for workspace ${data.workspaceId}`);
        return;
      }

      await this.notificationsService.notifyDeploymentStatus(
        data.workspaceId,
        userIds,
        {
          id: data.deploymentId,
          name: data.deploymentName,
          status: data.deploymentStatus,
        },
        {
          id: data.serviceId,
          name: data.serviceName,
        },
        {
          id: data.projectId,
          name: data.projectName,
        },
      );

      this.logger.log(
        `Deployment notification sent to ${userIds.length} users for deployment ${data.deploymentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process deployment notification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Process('build-status')
  async handleBuildStatus(job: Job<DeploymentNotificationJob & { buildStatus: string }>) {
    const data = job.data;

    this.logger.log(`Processing build notification: ${data.deploymentId}`);

    try {
      const members = await this.prisma.workspaceMember.findMany({
        where: { workspaceId: data.workspaceId },
        select: { userId: true },
      });

      const userIds = members.map((m) => m.userId);

      if (userIds.length === 0) return;

      await this.notificationsService.notifyBuildStatus(
        data.workspaceId,
        userIds,
        {
          status: data.buildStatus || 'FAILED',
          errorMessage: data.errorMessage,
        },
        {
          id: data.deploymentId,
          name: data.deploymentName,
        },
        {
          id: data.serviceId,
          name: data.serviceName,
        },
        {
          id: data.projectId,
          name: data.projectName,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to process build notification: ${error.message}`);
      throw error;
    }
  }
}
