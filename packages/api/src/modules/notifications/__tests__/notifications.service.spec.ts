import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService, NotifyParams } from '../notifications.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationsGateway } from '../notifications.gateway';
import { EmailService } from '../../email/email.service';
import { NotificationCategory } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;
  let gateway: NotificationsGateway;
  let emailService: EmailService;

  const mockNotification = {
    id: 'notif-123',
    userId: 'user-123',
    workspaceId: 'workspace-123',
    category: 'DEPLOYMENT' as NotificationCategory,
    title: 'Deployment Successful',
    message: 'Your service is now running',
    actionUrl: '/projects/project-123',
    metadata: { deploymentId: 'deploy-123' },
    isRead: false,
    emailSent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPreferences = {
    id: 'pref-123',
    userId: 'user-123',
    emailDeploySuccess: true,
    emailDeployFailed: true,
    emailBuildFailed: true,
    emailDomainVerified: true,
    emailInvitations: true,
    emailRoleChanges: true,
    inAppDeployments: true,
    inAppBuilds: true,
    inAppDomains: true,
    inAppWorkspace: true,
  };

  const mockPrisma = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockGateway = {
    emitNotification: jest.fn(),
    emitUnreadCount: jest.fn(),
  };

  const mockEmailService = {
    queueNotificationEmail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsGateway, useValue: mockGateway },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get(PrismaService);
    gateway = module.get(NotificationsGateway);
    emailService = module.get(EmailService);
  });

  describe('notify', () => {
    it('should create notifications for multiple users', async () => {
      (prisma.notification.create as jest.Mock).mockResolvedValue(mockNotification);
      (prisma.notification.count as jest.Mock).mockResolvedValue(1);

      const params: NotifyParams = {
        userIds: ['user-123', 'user-456'],
        workspaceId: 'workspace-123',
        category: 'DEPLOYMENT',
        title: 'Deployment Successful',
        message: 'Your service is now running',
        actionUrl: '/projects/project-123',
      };

      const result = await service.notify(params);

      expect(result).toHaveLength(2);
      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    });

    it('should emit WebSocket notification for each user', async () => {
      (prisma.notification.create as jest.Mock).mockResolvedValue(mockNotification);
      (prisma.notification.count as jest.Mock).mockResolvedValue(1);

      await service.notify({
        userIds: ['user-123'],
        workspaceId: 'workspace-123',
        category: 'DEPLOYMENT',
        title: 'Test',
        message: 'Test message',
      });

      expect(gateway.emitNotification).toHaveBeenCalledWith('user-123', mockNotification);
      expect(gateway.emitUnreadCount).toHaveBeenCalledWith('user-123', 1);
    });

    it('should queue email when sendEmail is true and preferences allow', async () => {
      (prisma.notification.create as jest.Mock).mockResolvedValue(mockNotification);
      (prisma.notification.count as jest.Mock).mockResolvedValue(1);
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(mockPreferences);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ email: 'test@example.com' });
      (prisma.notification.update as jest.Mock).mockResolvedValue({ ...mockNotification, emailSent: true });

      await service.notify({
        userIds: ['user-123'],
        workspaceId: 'workspace-123',
        category: 'DEPLOYMENT',
        title: 'Test',
        message: 'Test message',
        sendEmail: true,
      });

      expect(emailService.queueNotificationEmail).toHaveBeenCalled();
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: { emailSent: true },
      });
    });

    it('should not send email when user has disabled email notifications', async () => {
      (prisma.notification.create as jest.Mock).mockResolvedValue(mockNotification);
      (prisma.notification.count as jest.Mock).mockResolvedValue(1);
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue({
        ...mockPreferences,
        emailDeploySuccess: false,
        emailDeployFailed: false,
      });

      await service.notify({
        userIds: ['user-123'],
        workspaceId: 'workspace-123',
        category: 'DEPLOYMENT',
        title: 'Test',
        message: 'Test message',
        sendEmail: true,
      });

      expect(emailService.queueNotificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return notifications with pagination', async () => {
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([mockNotification]);
      (prisma.notification.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll('user-123', { limit: 10, offset: 0 });

      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });
    });

    it('should filter unread notifications when unreadOnly is true', async () => {
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.notification.count as jest.Mock).mockResolvedValue(0);

      await service.findAll('user-123', { unreadOnly: true });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123', isRead: false },
        }),
      );
    });

    it('should use default pagination values', async () => {
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.notification.count as jest.Mock).mockResolvedValue(0);

      await service.findAll('user-123');

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      (prisma.notification.count as jest.Mock).mockResolvedValue(5);

      const result = await service.getUnreadCount('user-123');

      expect(result).toBe(5);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue(mockNotification);
      (prisma.notification.update as jest.Mock).mockResolvedValue({ ...mockNotification, isRead: true });
      (prisma.notification.count as jest.Mock).mockResolvedValue(0);

      const result = await service.markAsRead('user-123', 'notif-123');

      expect(result.isRead).toBe(true);
      expect(gateway.emitUnreadCount).toHaveBeenCalledWith('user-123', 0);
    });

    it('should throw NotFoundException when notification does not exist', async () => {
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.markAsRead('user-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when notification belongs to different user', async () => {
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.markAsRead('user-456', 'notif-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read and return count', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-123');

      expect(result.count).toBe(5);
      expect(gateway.emitUnreadCount).toHaveBeenCalledWith('user-123', 0);
    });
  });

  describe('delete', () => {
    it('should delete notification', async () => {
      const readNotification = { ...mockNotification, isRead: true };
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue(readNotification);
      (prisma.notification.delete as jest.Mock).mockResolvedValue(readNotification);

      await service.delete('user-123', 'notif-123');

      expect(prisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
      });
    });

    it('should update unread count when deleting unread notification', async () => {
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue(mockNotification);
      (prisma.notification.delete as jest.Mock).mockResolvedValue(mockNotification);
      (prisma.notification.count as jest.Mock).mockResolvedValue(3);

      await service.delete('user-123', 'notif-123');

      expect(gateway.emitUnreadCount).toHaveBeenCalledWith('user-123', 3);
    });

    it('should throw NotFoundException when notification does not exist', async () => {
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.delete('user-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPreferences', () => {
    it('should return user notification preferences', async () => {
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(mockPreferences);

      const result = await service.getPreferences('user-123');

      expect(result).toEqual(mockPreferences);
    });

    it('should return null when preferences do not exist', async () => {
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getPreferences('user-456');

      expect(result).toBeNull();
    });
  });

  describe('updatePreferences', () => {
    it('should update existing preferences', async () => {
      const updates = { emailDeploySuccess: false };
      (prisma.notificationPreference.upsert as jest.Mock).mockResolvedValue({
        ...mockPreferences,
        ...updates,
      });

      const result = await service.updatePreferences('user-123', updates);

      expect(result.emailDeploySuccess).toBe(false);
      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        update: updates,
        create: { userId: 'user-123', ...updates },
      });
    });
  });

  describe('notifyDeploymentStatus', () => {
    it('should create notification for deployment success', async () => {
      const notifySpy = jest.spyOn(service, 'notify').mockResolvedValue([mockNotification]);

      await service.notifyDeploymentStatus(
        'workspace-123',
        ['user-123'],
        { id: 'deploy-123', name: 'v1.0.0', status: 'RUNNING' },
        { id: 'service-123', name: 'api' },
        { id: 'project-123', name: 'My Project' },
      );

      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'DEPLOYMENT',
          title: 'Deployment Successful',
          sendEmail: true,
        }),
      );
    });

    it('should not send email for pending status', async () => {
      const notifySpy = jest.spyOn(service, 'notify').mockResolvedValue([mockNotification]);

      await service.notifyDeploymentStatus(
        'workspace-123',
        ['user-123'],
        { id: 'deploy-123', name: 'v1.0.0', status: 'PENDING' },
        { id: 'service-123', name: 'api' },
        { id: 'project-123', name: 'My Project' },
      );

      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sendEmail: false,
        }),
      );
    });

    it('should not notify for unknown status', async () => {
      const notifySpy = jest.spyOn(service, 'notify').mockResolvedValue([mockNotification]);

      await service.notifyDeploymentStatus(
        'workspace-123',
        ['user-123'],
        { id: 'deploy-123', name: 'v1.0.0', status: 'UNKNOWN_STATUS' },
        { id: 'service-123', name: 'api' },
        { id: 'project-123', name: 'My Project' },
      );

      expect(notifySpy).not.toHaveBeenCalled();
    });
  });

  describe('notifyBuildStatus', () => {
    it('should notify on build failure', async () => {
      const notifySpy = jest.spyOn(service, 'notify').mockResolvedValue([mockNotification]);

      await service.notifyBuildStatus(
        'workspace-123',
        ['user-123'],
        { status: 'FAILED', errorMessage: 'npm install failed' },
        { id: 'deploy-123', name: 'v1.0.0' },
        { id: 'service-123', name: 'api' },
        { id: 'project-123', name: 'My Project' },
      );

      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'BUILD',
          title: 'Build Failed',
          sendEmail: true,
        }),
      );
    });

    it('should not notify on build success', async () => {
      const notifySpy = jest.spyOn(service, 'notify').mockResolvedValue([mockNotification]);

      await service.notifyBuildStatus(
        'workspace-123',
        ['user-123'],
        { status: 'SUCCESS' },
        { id: 'deploy-123', name: 'v1.0.0' },
        { id: 'service-123', name: 'api' },
        { id: 'project-123', name: 'My Project' },
      );

      expect(notifySpy).not.toHaveBeenCalled();
    });
  });

  describe('notifyDomainVerification', () => {
    it('should notify on domain verification success', async () => {
      const notifySpy = jest.spyOn(service, 'notify').mockResolvedValue([mockNotification]);

      await service.notifyDomainVerification(
        'workspace-123',
        ['user-123'],
        { id: 'domain-123', domain: 'example.com', isVerified: true },
        { id: 'service-123', name: 'api' },
        { id: 'project-123', name: 'My Project' },
      );

      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'DOMAIN',
          title: 'Domain Verified',
        }),
      );
    });
  });

  describe('notifyWorkspaceMemberEvent', () => {
    it('should notify workspace members on invitation', async () => {
      const notifySpy = jest.spyOn(service, 'notify').mockResolvedValue([mockNotification]);

      await service.notifyWorkspaceMemberEvent(
        'workspace-123',
        'INVITED',
        { id: 'workspace-123', name: 'My Workspace' },
        { email: 'new@example.com', name: 'New User', role: 'MEMBER' },
        ['user-123'],
      );

      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'WORKSPACE',
          title: 'Member Invited',
          sendEmail: true,
        }),
      );
    });

    it('should not send email for member leaving', async () => {
      const notifySpy = jest.spyOn(service, 'notify').mockResolvedValue([mockNotification]);

      await service.notifyWorkspaceMemberEvent(
        'workspace-123',
        'LEFT',
        { id: 'workspace-123', name: 'My Workspace' },
        { email: 'left@example.com' },
        ['user-123'],
      );

      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sendEmail: false,
        }),
      );
    });
  });
});
