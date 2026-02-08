import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationCategory, Notification, NotificationPreference } from '@prisma/client';
import { NotificationsGateway } from './notifications.gateway';
import { EmailService } from '../email/email.service';

export interface NotifyParams {
  userIds: string[];
  workspaceId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  sendEmail?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    @Inject(forwardRef(() => EmailService))
    private readonly emailService: EmailService,
  ) {}

  async notify(params: NotifyParams): Promise<Notification[]> {
    const { userIds, workspaceId, category, title, message, actionUrl, metadata, sendEmail } = params;

    const notifications: Notification[] = [];

    for (const userId of userIds) {
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          workspaceId,
          category,
          title,
          message,
          actionUrl,
          metadata,
          emailSent: false,
        },
      });

      notifications.push(notification);

      // Emit to WebSocket
      this.gateway.emitNotification(userId, notification);

      // Update unread count
      const unreadCount = await this.getUnreadCount(userId);
      this.gateway.emitUnreadCount(userId, unreadCount);

      this.logger.log(`Notification created for user ${userId}: ${title}`);
    }

    // Handle email sending if requested
    if (sendEmail) {
      await this.queueEmailNotifications(notifications);
    }

    return notifications;
  }

  private async queueEmailNotifications(notifications: Notification[]): Promise<void> {
    for (const notification of notifications) {
      const preferences = await this.getPreferences(notification.userId);

      if (this.shouldSendEmail(notification.category, preferences)) {
        // Get user email
        const user = await this.prisma.user.findUnique({
          where: { id: notification.userId },
          select: { email: true },
        });

        if (user) {
          await this.emailService.queueNotificationEmail({
            userId: notification.userId,
            email: user.email,
            category: notification.category,
            title: notification.title,
            message: notification.message,
            actionUrl: notification.actionUrl,
            metadata: notification.metadata as Record<string, any>,
          });

          // Mark email as queued
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { emailSent: true },
          });
        }
      }
    }
  }

  private shouldSendEmail(category: NotificationCategory, preferences: NotificationPreference | null): boolean {
    if (!preferences) return true; // Default to sending emails

    switch (category) {
      case 'DEPLOYMENT':
        return preferences.emailDeploySuccess || preferences.emailDeployFailed;
      case 'BUILD':
        return preferences.emailBuildFailed;
      case 'DOMAIN':
        return preferences.emailDomainVerified;
      case 'WORKSPACE':
        return preferences.emailInvitations || preferences.emailRoleChanges;
      default:
        return true;
    }
  }

  async findAll(
    userId: string,
    options: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
  ): Promise<{ notifications: Notification[]; total: number }> {
    const { limit = 50, offset = 0, unreadOnly = false } = options;

    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { notifications, total };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    // Update unread count via WebSocket
    const unreadCount = await this.getUnreadCount(userId);
    this.gateway.emitUnreadCount(userId, unreadCount);

    return updated;
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    // Update unread count via WebSocket
    this.gateway.emitUnreadCount(userId, 0);

    return { count: result.count };
  }

  async delete(userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    // Update unread count if needed
    if (!notification.isRead) {
      const unreadCount = await this.getUnreadCount(userId);
      this.gateway.emitUnreadCount(userId, unreadCount);
    }
  }

  async getPreferences(userId: string): Promise<NotificationPreference | null> {
    return this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
  }

  async updatePreferences(
    userId: string,
    updates: Partial<Omit<NotificationPreference, 'id' | 'userId'>>,
  ): Promise<NotificationPreference> {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        ...updates,
      },
    });
  }

  // Convenience methods for specific notification types

  async notifyDeploymentStatus(
    workspaceId: string,
    userIds: string[],
    deployment: { id: string; name: string; status: string },
    service: { id: string; name: string },
    project: { id: string; name: string },
  ): Promise<void> {
    const statusMessages: Record<string, { title: string; message: string; sendEmail: boolean }> = {
      PENDING: {
        title: 'Deployment Started',
        message: `Deployment for ${service.name} has been queued.`,
        sendEmail: false,
      },
      BUILDING: {
        title: 'Building Deployment',
        message: `Building image for ${service.name}...`,
        sendEmail: false,
      },
      DEPLOYING: {
        title: 'Deploying',
        message: `Deploying ${service.name} to Kubernetes...`,
        sendEmail: false,
      },
      RUNNING: {
        title: 'Deployment Successful',
        message: `${service.name} is now running successfully.`,
        sendEmail: true,
      },
      FAILED: {
        title: 'Deployment Failed',
        message: `Deployment for ${service.name} has failed.`,
        sendEmail: true,
      },
      CRASHED: {
        title: 'Deployment Crashed',
        message: `${service.name} has crashed and is being restarted.`,
        sendEmail: true,
      },
      STOPPED: {
        title: 'Deployment Stopped',
        message: `${service.name} has been stopped.`,
        sendEmail: false,
      },
    };

    const statusInfo = statusMessages[deployment.status];
    if (!statusInfo) return;

    await this.notify({
      userIds,
      workspaceId,
      category: 'DEPLOYMENT',
      title: statusInfo.title,
      message: statusInfo.message,
      actionUrl: `/projects/${project.id}?service=${service.id}`,
      metadata: {
        deploymentId: deployment.id,
        deploymentName: deployment.name,
        deploymentStatus: deployment.status,
        serviceId: service.id,
        serviceName: service.name,
        projectId: project.id,
        projectName: project.name,
      },
      sendEmail: statusInfo.sendEmail,
    });
  }

  async notifyBuildStatus(
    workspaceId: string,
    userIds: string[],
    build: { status: string; errorMessage?: string },
    deployment: { id: string; name: string },
    service: { id: string; name: string },
    project: { id: string; name: string },
  ): Promise<void> {
    if (build.status === 'FAILED') {
      await this.notify({
        userIds,
        workspaceId,
        category: 'BUILD',
        title: 'Build Failed',
        message: `Build for ${service.name} has failed: ${build.errorMessage || 'Unknown error'}`,
        actionUrl: `/projects/${project.id}?service=${service.id}`,
        metadata: {
          deploymentId: deployment.id,
          serviceId: service.id,
          serviceName: service.name,
          projectId: project.id,
          errorMessage: build.errorMessage,
        },
        sendEmail: true,
      });
    }
  }

  async notifyDomainVerification(
    workspaceId: string,
    userIds: string[],
    domain: { id: string; domain: string; isVerified: boolean },
    service: { id: string; name: string },
    project: { id: string; name: string },
  ): Promise<void> {
    const title = domain.isVerified ? 'Domain Verified' : 'Domain Verification Failed';
    const message = domain.isVerified
      ? `Domain ${domain.domain} has been verified for ${service.name}.`
      : `Domain verification failed for ${domain.domain}.`;

    await this.notify({
      userIds,
      workspaceId,
      category: 'DOMAIN',
      title,
      message,
      actionUrl: `/projects/${project.id}?service=${service.id}`,
      metadata: {
        domainId: domain.id,
        domain: domain.domain,
        isVerified: domain.isVerified,
        serviceId: service.id,
        serviceName: service.name,
        projectId: project.id,
      },
      sendEmail: true,
    });
  }

  async notifyServiceEvent(
    workspaceId: string,
    userIds: string[],
    event: 'CREATED' | 'UPDATED' | 'DELETED',
    service: { id: string; name: string },
    project: { id: string; name: string },
  ): Promise<void> {
    const messages: Record<string, { title: string; message: string }> = {
      CREATED: {
        title: 'Service Created',
        message: `Service ${service.name} has been created in ${project.name}.`,
      },
      UPDATED: {
        title: 'Service Updated',
        message: `Service ${service.name} has been updated.`,
      },
      DELETED: {
        title: 'Service Deleted',
        message: `Service ${service.name} has been deleted from ${project.name}.`,
      },
    };

    const msgInfo = messages[event];
    if (!msgInfo) return;

    await this.notify({
      userIds,
      workspaceId,
      category: 'SERVICE',
      title: msgInfo.title,
      message: msgInfo.message,
      actionUrl: event !== 'DELETED' ? `/projects/${project.id}?service=${service.id}` : `/projects/${project.id}`,
      metadata: {
        event,
        serviceId: service.id,
        serviceName: service.name,
        projectId: project.id,
        projectName: project.name,
      },
      sendEmail: false,
    });
  }

  async notifyWorkspaceMemberEvent(
    workspaceId: string,
    event: 'INVITED' | 'JOINED' | 'LEFT' | 'ROLE_CHANGED',
    workspace: { id: string; name: string },
    member: { email: string; name?: string; role?: string },
    notifyUserIds: string[],
  ): Promise<void> {
    const messages: Record<string, { title: string; message: string; sendEmail: boolean }> = {
      INVITED: {
        title: 'Member Invited',
        message: `${member.email} has been invited to ${workspace.name}.`,
        sendEmail: true,
      },
      JOINED: {
        title: 'Member Joined',
        message: `${member.name || member.email} has joined ${workspace.name}.`,
        sendEmail: false,
      },
      LEFT: {
        title: 'Member Left',
        message: `${member.name || member.email} has left ${workspace.name}.`,
        sendEmail: false,
      },
      ROLE_CHANGED: {
        title: 'Role Changed',
        message: `${member.name || member.email}'s role has been changed to ${member.role} in ${workspace.name}.`,
        sendEmail: true,
      },
    };

    const msgInfo = messages[event];
    if (!msgInfo) return;

    await this.notify({
      userIds: notifyUserIds,
      workspaceId,
      category: 'WORKSPACE',
      title: msgInfo.title,
      message: msgInfo.message,
      actionUrl: `/settings/workspace`,
      metadata: {
        event,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        memberEmail: member.email,
        memberName: member.name,
        memberRole: member.role,
      },
      sendEmail: msgInfo.sendEmail,
    });
  }
}
