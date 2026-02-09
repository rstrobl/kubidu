import { Test, TestingModule } from '@nestjs/testing';
import { EmailProcessor } from '../email.processor';
import { EmailService, NotificationEmailData } from '../email.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationCategory } from '@prisma/client';
import { Job } from 'bull';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let emailService: EmailService;
  let prisma: PrismaService;

  const mockEmailService = {
    sendNotificationEmail: jest.fn(),
  };

  const mockPrisma = {
    notificationPreference: {
      findUnique: jest.fn(),
    },
  };

  const defaultPreferences = {
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

  const createMockJob = (data: NotificationEmailData): Job<NotificationEmailData> => ({
    data,
    id: 'job-123',
    name: 'send-notification',
    attemptsMade: 0,
    opts: {},
    queue: {} as any,
    timestamp: Date.now(),
    processedOn: undefined,
    finishedOn: undefined,
    failedReason: undefined,
    stacktrace: [],
    returnvalue: undefined,
    progress: jest.fn(),
    log: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    retry: jest.fn(),
    discard: jest.fn(),
    promote: jest.fn(),
    lockKey: jest.fn(),
    releaseLock: jest.fn(),
    takeLock: jest.fn(),
    moveToCompleted: jest.fn(),
    moveToFailed: jest.fn(),
    isCompleted: jest.fn(),
    isFailed: jest.fn(),
    isDelayed: jest.fn(),
    isActive: jest.fn(),
    isWaiting: jest.fn(),
    isPaused: jest.fn(),
    isStuck: jest.fn(),
    getState: jest.fn(),
    extendLock: jest.fn(),
    finished: jest.fn(),
    toJSON: jest.fn(),
  } as any);

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        { provide: EmailService, useValue: mockEmailService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
    emailService = module.get(EmailService);
    prisma = module.get(PrismaService);
  });

  describe('handleSendNotification', () => {
    it('should send notification email when preferences allow', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(defaultPreferences);
      mockEmailService.sendNotificationEmail.mockResolvedValue(true);

      const job = createMockJob({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'DEPLOYMENT' as NotificationCategory,
        title: 'Deployment Successful',
        message: 'Your service is now running',
        actionUrl: '/projects/123',
      });

      const result = await processor.handleSendNotification(job);

      expect(result).toEqual({ success: true });
      expect(mockEmailService.sendNotificationEmail).toHaveBeenCalledWith(job.data);
    });

    it('should skip email when no preferences exist (defaults to true)', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockEmailService.sendNotificationEmail.mockResolvedValue(true);

      const job = createMockJob({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'DEPLOYMENT' as NotificationCategory,
        title: 'Deployment Successful',
        message: 'Your service is now running',
      });

      const result = await processor.handleSendNotification(job);

      expect(result).toEqual({ success: true });
      expect(mockEmailService.sendNotificationEmail).toHaveBeenCalled();
    });

    it('should skip email for successful deployment when disabled in preferences', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        ...defaultPreferences,
        emailDeploySuccess: false,
      });

      const job = createMockJob({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'DEPLOYMENT' as NotificationCategory,
        title: 'Deployment Successful',
        message: 'Your service is now running',
      });

      const result = await processor.handleSendNotification(job);

      expect(result).toEqual({ skipped: true, reason: 'disabled in preferences' });
      expect(mockEmailService.sendNotificationEmail).not.toHaveBeenCalled();
    });

    it('should skip email for Running deployment when deploy success is disabled', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        ...defaultPreferences,
        emailDeploySuccess: false,
      });

      const job = createMockJob({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'DEPLOYMENT' as NotificationCategory,
        title: 'Service Running',
        message: 'Your service is now running',
      });

      const result = await processor.handleSendNotification(job);

      expect(result).toEqual({ skipped: true, reason: 'disabled in preferences' });
    });

    it('should skip email for failed deployment when disabled', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        ...defaultPreferences,
        emailDeployFailed: false,
      });

      const job = createMockJob({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'DEPLOYMENT' as NotificationCategory,
        title: 'Deployment Failed',
        message: 'Your deployment has failed',
      });

      const result = await processor.handleSendNotification(job);

      expect(result).toEqual({ skipped: true, reason: 'disabled in preferences' });
    });

    it('should skip email for Crashed service when deploy failed is disabled', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        ...defaultPreferences,
        emailDeployFailed: false,
      });

      const job = createMockJob({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'DEPLOYMENT' as NotificationCategory,
        title: 'Service Crashed',
        message: 'Your service has crashed',
      });

      const result = await processor.handleSendNotification(job);

      expect(result).toEqual({ skipped: true, reason: 'disabled in preferences' });
    });

    it('should skip email for failed build when disabled', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        ...defaultPreferences,
        emailBuildFailed: false,
      });

      const job = createMockJob({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'BUILD' as NotificationCategory,
        title: 'Build Failed',
        message: 'Your build has failed',
      });

      const result = await processor.handleSendNotification(job);

      expect(result).toEqual({ skipped: true, reason: 'disabled in preferences' });
    });

    it('should skip email for domain verification when disabled', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        ...defaultPreferences,
        emailDomainVerified: false,
      });

      const job = createMockJob({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'DOMAIN' as NotificationCategory,
        title: 'Domain Verified',
        message: 'Your domain has been verified',
      });

      const result = await processor.handleSendNotification(job);

      expect(result).toEqual({ skipped: true, reason: 'disabled in preferences' });
    });

    it('should skip email for workspace invitation when disabled', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        ...defaultPreferences,
        emailInvitations: false,
      });

      const job = createMockJob({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'WORKSPACE' as NotificationCategory,
        title: 'Member Invited',
        message: 'You have been invited to join',
      });

      const result = await processor.handleSendNotification(job);

      expect(result).toEqual({ skipped: true, reason: 'disabled in preferences' });
    });

    it('should skip email for role change when disabled', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        ...defaultPreferences,
        emailRoleChanges: false,
      });

      const job = createMockJob({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'WORKSPACE' as NotificationCategory,
        title: 'Role Changed',
        message: 'Your role has been changed',
      });

      const result = await processor.handleSendNotification(job);

      expect(result).toEqual({ skipped: true, reason: 'disabled in preferences' });
    });

    it('should send email for unhandled deployment title', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(defaultPreferences);
      mockEmailService.sendNotificationEmail.mockResolvedValue(true);

      const job = createMockJob({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'DEPLOYMENT' as NotificationCategory,
        title: 'Deployment Started',
        message: 'Your deployment has started',
      });

      const result = await processor.handleSendNotification(job);

      expect(result).toEqual({ success: true });
    });

    it('should send email for unhandled build title', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(defaultPreferences);
      mockEmailService.sendNotificationEmail.mockResolvedValue(true);

      const job = createMockJob({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'BUILD' as NotificationCategory,
        title: 'Build Started',
        message: 'Your build has started',
      });

      const result = await processor.handleSendNotification(job);

      expect(result).toEqual({ success: true });
    });

    it('should send email for unhandled workspace event', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(defaultPreferences);
      mockEmailService.sendNotificationEmail.mockResolvedValue(true);

      const job = createMockJob({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'WORKSPACE' as NotificationCategory,
        title: 'Project Created',
        message: 'A new project was created',
      });

      const result = await processor.handleSendNotification(job);

      expect(result).toEqual({ success: true });
    });

    it('should send email for SERVICE category', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(defaultPreferences);
      mockEmailService.sendNotificationEmail.mockResolvedValue(true);

      const job = createMockJob({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'SERVICE' as NotificationCategory,
        title: 'Service Updated',
        message: 'Your service has been updated',
      });

      const result = await processor.handleSendNotification(job);

      expect(result).toEqual({ success: true });
    });

    it('should throw error when email sending fails', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(defaultPreferences);
      mockEmailService.sendNotificationEmail.mockRejectedValue(new Error('SMTP error'));

      const job = createMockJob({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'DEPLOYMENT' as NotificationCategory,
        title: 'Deployment Successful',
        message: 'Your service is now running',
      });

      await expect(processor.handleSendNotification(job)).rejects.toThrow('SMTP error');
    });
  });
});
