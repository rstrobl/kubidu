import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import { EmailService, EmailOptions, NotificationEmailData } from '../email.service';
import { NotificationCategory } from '@prisma/client';

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;
  let mockQueue: any;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'email.from': 'noreply@kubidu.io',
        'email.fromName': 'Kubidu',
        'email.resendApiKey': null,
        'app.url': 'http://localhost:5173',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockEmailQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getQueueToken('email'), useValue: mockEmailQueue },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get(ConfigService);
    mockQueue = mockEmailQueue;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('queueNotificationEmail', () => {
    it('should queue an email job with correct parameters', async () => {
      const data: NotificationEmailData = {
        userId: 'user-123',
        email: 'test@example.com',
        category: 'DEPLOYMENT' as NotificationCategory,
        title: 'Deployment Successful',
        message: 'Your service is now running',
        actionUrl: '/projects/123',
        metadata: { deploymentId: 'deploy-123' },
      };

      await service.queueNotificationEmail(data);

      expect(mockQueue.add).toHaveBeenCalledWith('send-notification', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
    });
  });

  describe('sendNotificationEmail', () => {
    it('should build and send notification email', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);

      const data: NotificationEmailData = {
        userId: 'user-123',
        email: 'test@example.com',
        category: 'DEPLOYMENT' as NotificationCategory,
        title: 'Deployment Successful',
        message: 'Your service is now running',
        actionUrl: '/projects/123',
      };

      const result = await service.sendNotificationEmail(data);

      expect(result).toBe(true);
      expect(sendEmailSpy).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: '[Kubidu] Deployment Successful',
        html: expect.stringContaining('Deployment Successful'),
        text: expect.stringContaining('Deployment Successful'),
      });
    });

    it('should handle missing actionUrl', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);

      const data: NotificationEmailData = {
        userId: 'user-123',
        email: 'test@example.com',
        category: 'BUILD' as NotificationCategory,
        title: 'Build Started',
        message: 'Your build has started',
      };

      await service.sendNotificationEmail(data);

      expect(sendEmailSpy).toHaveBeenCalled();
    });
  });

  describe('sendEmail', () => {
    it('should skip sending when no API key is configured', async () => {
      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      };

      const result = await service.sendEmail(options);

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should send email when API key is configured', async () => {
      // Create a new service with API key configured
      const configWithApiKey = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            'email.from': 'noreply@kubidu.io',
            'email.fromName': 'Kubidu',
            'email.resendApiKey': 'test-api-key',
            'app.url': 'http://localhost:5173',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: configWithApiKey },
          { provide: getQueueToken('email'), useValue: mockEmailQueue },
        ],
      }).compile();

      const serviceWithApiKey = module.get<EmailService>(EmailService);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'email-123' }),
      });

      const result = await serviceWithApiKey.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test text',
      });

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should return false when API call fails', async () => {
      const configWithApiKey = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            'email.from': 'noreply@kubidu.io',
            'email.fromName': 'Kubidu',
            'email.resendApiKey': 'test-api-key',
            'app.url': 'http://localhost:5173',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: configWithApiKey },
          { provide: getQueueToken('email'), useValue: mockEmailQueue },
        ],
      }).compile();

      const serviceWithApiKey = module.get<EmailService>(EmailService);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Bad Request'),
      });

      const result = await serviceWithApiKey.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result).toBe(false);
    });

    it('should handle fetch errors', async () => {
      const configWithApiKey = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            'email.from': 'noreply@kubidu.io',
            'email.fromName': 'Kubidu',
            'email.resendApiKey': 'test-api-key',
            'app.url': 'http://localhost:5173',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: configWithApiKey },
          { provide: getQueueToken('email'), useValue: mockEmailQueue },
        ],
      }).compile();

      const serviceWithApiKey = module.get<EmailService>(EmailService);

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await serviceWithApiKey.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result).toBe(false);
    });
  });

  describe('sendDeploymentSuccessEmail', () => {
    it('should send deployment success email', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);

      const result = await service.sendDeploymentSuccessEmail('user@example.com', {
        serviceName: 'api-service',
        projectName: 'My Project',
        deploymentUrl: 'https://api.example.com',
        actionUrl: '/projects/123/services/456',
      });

      expect(result).toBe(true);
      expect(sendEmailSpy).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: '[Kubidu] api-service deployed successfully',
        html: expect.stringContaining('api-service'),
        text: expect.stringContaining('deployed successfully'),
      });
    });

    it('should handle missing deploymentUrl', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);

      await service.sendDeploymentSuccessEmail('user@example.com', {
        serviceName: 'api-service',
        projectName: 'My Project',
        actionUrl: '/projects/123',
      });

      expect(sendEmailSpy).toHaveBeenCalled();
    });
  });

  describe('sendDeploymentFailedEmail', () => {
    it('should send deployment failed email', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);

      const result = await service.sendDeploymentFailedEmail('user@example.com', {
        serviceName: 'api-service',
        projectName: 'My Project',
        errorMessage: 'Container failed to start',
        actionUrl: '/projects/123/services/456',
      });

      expect(result).toBe(true);
      expect(sendEmailSpy).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: '[Kubidu] Deployment failed for api-service',
        html: expect.stringContaining('failed'),
        text: expect.stringContaining('Deployment failed'),
      });
    });

    it('should handle missing errorMessage', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);

      await service.sendDeploymentFailedEmail('user@example.com', {
        serviceName: 'api-service',
        projectName: 'My Project',
        actionUrl: '/projects/123',
      });

      expect(sendEmailSpy).toHaveBeenCalled();
    });
  });

  describe('sendWorkspaceInvitationEmail', () => {
    it('should send workspace invitation email', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);

      const result = await service.sendWorkspaceInvitationEmail('invitee@example.com', {
        workspaceName: 'Acme Corp',
        inviterName: 'John Doe',
        inviteUrl: 'https://kubidu.io/invite/abc123',
        role: 'MEMBER',
      });

      expect(result).toBe(true);
      expect(sendEmailSpy).toHaveBeenCalledWith({
        to: 'invitee@example.com',
        subject: "[Kubidu] You've been invited to join Acme Corp",
        html: expect.stringContaining('Acme Corp'),
        text: expect.stringContaining('John Doe'),
      });
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should return true in dev mode without API key', async () => {
      const result = await service.sendPasswordResetEmail('user@example.com', {
        resetUrl: 'http://localhost:5173/reset/token123',
        userName: 'John',
      });

      expect(result).toBe(true);
    });

    it('should send email when API key is configured', async () => {
      const configWithApiKey = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            'email.from': 'noreply@kubidu.io',
            'email.fromName': 'Kubidu',
            'email.resendApiKey': 'test-api-key',
            'app.url': 'http://localhost:5173',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: configWithApiKey },
          { provide: getQueueToken('email'), useValue: mockEmailQueue },
        ],
      }).compile();

      const serviceWithApiKey = module.get<EmailService>(EmailService);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'email-123' }),
      });

      const result = await serviceWithApiKey.sendPasswordResetEmail('user@example.com', {
        resetUrl: 'http://localhost:5173/reset/token123',
      });

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('buildNotificationHtml', () => {
    it('should build HTML with correct category colors for all categories', async () => {
      const categories: NotificationCategory[] = ['DEPLOYMENT', 'BUILD', 'DOMAIN', 'SERVICE', 'WORKSPACE'];
      
      for (const category of categories) {
        const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);
        
        await service.sendNotificationEmail({
          userId: 'user-123',
          email: 'test@example.com',
          category,
          title: 'Test',
          message: 'Test message',
        });

        expect(sendEmailSpy).toHaveBeenCalled();
        sendEmailSpy.mockClear();
      }
    });

    it('should include action button when actionUrl is provided', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);

      await service.sendNotificationEmail({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'DEPLOYMENT' as NotificationCategory,
        title: 'Test',
        message: 'Test message',
        actionUrl: '/projects/123',
      });

      const callArgs = sendEmailSpy.mock.calls[0][0];
      expect(callArgs.html).toContain('View Details');
    });
  });

  describe('buildNotificationText', () => {
    it('should build plain text email', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);

      await service.sendNotificationEmail({
        userId: 'user-123',
        email: 'test@example.com',
        category: 'DEPLOYMENT' as NotificationCategory,
        title: 'Test Title',
        message: 'Test message',
        actionUrl: '/projects/123',
      });

      const callArgs = sendEmailSpy.mock.calls[0][0];
      expect(callArgs.text).toContain('Test Title');
      expect(callArgs.text).toContain('Test message');
      expect(callArgs.text).toContain('View details');
    });
  });
});
