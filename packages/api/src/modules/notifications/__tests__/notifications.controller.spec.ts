import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from '../notifications.controller';
import { NotificationsService } from '../notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockNotification = {
    id: 'notification-123',
    userId: 'user-123',
    workspaceId: 'workspace-123',
    category: 'DEPLOYMENT',
    title: 'Deployment successful',
    message: 'Your service was deployed',
    actionUrl: '/projects/123',
    metadata: {},
    isRead: false,
    emailSent: false,
    createdAt: new Date(),
  };

  const mockPreferences = {
    emailDeploySuccess: true,
    emailDeployFailed: true,
    emailBuildFailed: true,
    emailDomainVerified: true,
    emailInvitations: true,
    emailRoleChanges: true,
  };

  beforeEach(async () => {
    const mockNotificationsService = {
      findAll: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      delete: jest.fn(),
      getUnreadCount: jest.fn(),
      getPreferences: jest.fn(),
      updatePreferences: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    notificationsService = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all notifications for a user', async () => {
      notificationsService.findAll.mockResolvedValue([mockNotification] as any);

      const result = await controller.findAll(
        { user: { id: 'user-123' } },
        10,
        0,
        undefined,
      );

      expect(result).toHaveLength(1);
      expect(notificationsService.findAll).toHaveBeenCalledWith('user-123', {
        limit: 10,
        offset: 0,
        unreadOnly: false,
      });
    });

    it('should filter unread notifications', async () => {
      notificationsService.findAll.mockResolvedValue([mockNotification] as any);

      await controller.findAll(
        { user: { id: 'user-123' } },
        10,
        0,
        true,
      );

      expect(notificationsService.findAll).toHaveBeenCalledWith('user-123', {
        limit: 10,
        offset: 0,
        unreadOnly: true,
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const readNotification = { ...mockNotification, isRead: true };
      notificationsService.markAsRead.mockResolvedValue(readNotification as any);

      const result = await controller.markAsRead(
        { user: { id: 'user-123' } },
        'notification-123',
      );

      expect(result.isRead).toBe(true);
      expect(notificationsService.markAsRead).toHaveBeenCalledWith('user-123', 'notification-123');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      notificationsService.markAllAsRead.mockResolvedValue({ count: 5 } as any);

      const result = await controller.markAllAsRead({ user: { id: 'user-123' } });

      expect(result).toEqual({ count: 5 });
      expect(notificationsService.markAllAsRead).toHaveBeenCalledWith('user-123');
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      notificationsService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(
        { user: { id: 'user-123' } },
        'notification-123',
      );

      expect(result).toEqual({ success: true });
      expect(notificationsService.delete).toHaveBeenCalledWith('user-123', 'notification-123');
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      notificationsService.getUnreadCount.mockResolvedValue(3);

      const result = await controller.getUnreadCount({ user: { id: 'user-123' } });

      expect(result).toEqual({ count: 3 });
      expect(notificationsService.getUnreadCount).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getPreferences', () => {
    it('should return notification preferences', async () => {
      notificationsService.getPreferences.mockResolvedValue(mockPreferences as any);

      const result = await controller.getPreferences({ user: { id: 'user-123' } });

      expect(result).toEqual(mockPreferences);
      expect(notificationsService.getPreferences).toHaveBeenCalledWith('user-123');
    });

    it('should return default preferences when none exist', async () => {
      notificationsService.getPreferences.mockResolvedValue(null);

      const result = await controller.getPreferences({ user: { id: 'user-123' } });

      expect(result).toEqual(mockPreferences);
    });
  });

  describe('updatePreferences', () => {
    it('should update notification preferences', async () => {
      const updateDto = { emailDeploySuccess: false };
      const updatedPreferences = { ...mockPreferences, emailDeploySuccess: false };
      notificationsService.updatePreferences.mockResolvedValue(updatedPreferences as any);

      const result = await controller.updatePreferences(
        { user: { id: 'user-123' } },
        updateDto,
      );

      expect(result.emailDeploySuccess).toBe(false);
      expect(notificationsService.updatePreferences).toHaveBeenCalledWith('user-123', updateDto);
    });
  });
});
