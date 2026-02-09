import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService, WebhookPayload } from '../webhooks.service';
import { PrismaService } from '../../../database/prisma.service';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: jest.Mocked<PrismaService>;
  let httpService: jest.Mocked<HttpService>;

  const mockWebhook = {
    id: 'webhook-123',
    projectId: 'project-123',
    name: 'Test Webhook',
    url: 'https://example.com/webhook',
    type: 'CUSTOM',
    secret: 'test-secret',
    events: ['deployment.success', 'deployment.failed'],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPayload: WebhookPayload = {
    event: 'deployment.success',
    timestamp: new Date().toISOString(),
    project: {
      id: 'project-123',
      name: 'Test Project',
      slug: 'test-project',
    },
    deployment: {
      id: 'deployment-123',
      name: 'test-deployment',
      status: 'RUNNING',
    },
  };

  beforeEach(async () => {
    const mockPrisma = {
      webhook: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      webhookDelivery: {
        create: jest.fn(),
      },
    };

    const mockHttpService = {
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    prisma = module.get(PrismaService);
    httpService = module.get(HttpService);
  });

  describe('create', () => {
    it('should create a webhook', async () => {
      (prisma.webhook.create as jest.Mock).mockResolvedValue(mockWebhook);

      const result = await service.create('project-123', {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['deployment.success'],
      });

      expect(result.id).toBe(mockWebhook.id);
      expect(prisma.webhook.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all webhooks for a project', async () => {
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([mockWebhook]);

      const result = await service.findAll('project-123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Webhook');
    });
  });

  describe('findOne', () => {
    it('should return a webhook with deliveries', async () => {
      (prisma.webhook.findUnique as jest.Mock).mockResolvedValue({
        ...mockWebhook,
        deliveries: [],
      });

      const result = await service.findOne('webhook-123');

      expect(result?.id).toBe(mockWebhook.id);
    });
  });

  describe('update', () => {
    it('should update a webhook', async () => {
      (prisma.webhook.update as jest.Mock).mockResolvedValue({
        ...mockWebhook,
        name: 'Updated Webhook',
      });

      const result = await service.update('webhook-123', { name: 'Updated Webhook' });

      expect(result.name).toBe('Updated Webhook');
    });
  });

  describe('delete', () => {
    it('should delete a webhook', async () => {
      (prisma.webhook.delete as jest.Mock).mockResolvedValue(mockWebhook);

      const result = await service.delete('webhook-123');

      expect(result.id).toBe(mockWebhook.id);
      expect(prisma.webhook.delete).toHaveBeenCalledWith({ where: { id: 'webhook-123' } });
    });
  });

  describe('trigger', () => {
    it('should trigger webhooks for an event', async () => {
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([mockWebhook]);
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 200, data: 'OK' }),
      );
      (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});

      const results = await service.trigger('project-123', 'deployment.success', mockPayload);

      expect(results).toHaveLength(1);
      expect(httpService.post).toHaveBeenCalled();
    });

    it('should handle no webhooks for event', async () => {
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([]);

      const results = await service.trigger('project-123', 'deployment.success', mockPayload);

      expect(results).toHaveLength(0);
    });
  });

  describe('deliver', () => {
    it('should deliver webhook payload', async () => {
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 200, data: 'OK' }),
      );
      (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});

      await service.deliver(mockWebhook, 'deployment.success', mockPayload);

      expect(httpService.post).toHaveBeenCalledWith(
        mockWebhook.url,
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Kubidu-Event': 'deployment.success',
          }),
        }),
      );
    });

    it('should include HMAC signature when secret is set', async () => {
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 200, data: 'OK' }),
      );
      (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});

      await service.deliver(mockWebhook, 'deployment.success', mockPayload);

      expect(httpService.post).toHaveBeenCalledWith(
        mockWebhook.url,
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Kubidu-Signature': expect.stringMatching(/^sha256=/),
          }),
        }),
      );
    });

    it('should build Discord-formatted payload for Discord webhooks', async () => {
      const discordWebhook = { ...mockWebhook, type: 'DISCORD' };
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 200, data: 'OK' }),
      );
      (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});
      (prisma.webhook.update as jest.Mock).mockResolvedValue({});

      await service.deliver(discordWebhook, 'deployment.success', mockPayload);

      expect(httpService.post).toHaveBeenCalledWith(
        discordWebhook.url,
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              title: expect.stringContaining('Deployment succeeded'),
              color: expect.any(Number),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it('should build Slack-formatted payload for Slack webhooks', async () => {
      const slackWebhook = { ...mockWebhook, type: 'SLACK' };
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 200, data: 'OK' }),
      );
      (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});
      (prisma.webhook.update as jest.Mock).mockResolvedValue({});

      await service.deliver(slackWebhook, 'deployment.success', mockPayload);

      expect(httpService.post).toHaveBeenCalledWith(
        slackWebhook.url,
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              color: expect.any(String),
              blocks: expect.any(Array),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it('should handle delivery failure and log error', async () => {
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 500, data: 'Internal Server Error' }),
      );
      (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});
      (prisma.webhook.update as jest.Mock).mockResolvedValue({});

      await expect(
        service.deliver(mockWebhook, 'deployment.failed', mockPayload),
      ).rejects.toThrow();
    });

    it('should include commit info in Discord embed fields', async () => {
      const discordWebhook = { ...mockWebhook, type: 'DISCORD' };
      const payloadWithCommit: WebhookPayload = {
        ...mockPayload,
        deployment: {
          ...mockPayload.deployment!,
          gitCommitSha: 'abc123def456',
          gitCommitMessage: 'Fix bug',
        },
      };
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 200, data: 'OK' }),
      );
      (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});
      (prisma.webhook.update as jest.Mock).mockResolvedValue({});

      await service.deliver(discordWebhook, 'deployment.success', payloadWithCommit);

      expect(httpService.post).toHaveBeenCalledWith(
        discordWebhook.url,
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              fields: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Commit',
                  value: expect.stringContaining('abc123d'),
                }),
              ]),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it('should include service info in Slack blocks', async () => {
      const slackWebhook = { ...mockWebhook, type: 'SLACK' };
      const payloadWithService: WebhookPayload = {
        ...mockPayload,
        service: {
          id: 'service-123',
          name: 'API Service',
          type: 'GITHUB',
        },
      };
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 200, data: 'OK' }),
      );
      (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});
      (prisma.webhook.update as jest.Mock).mockResolvedValue({});

      await service.deliver(slackWebhook, 'service.created', payloadWithService);

      expect(httpService.post).toHaveBeenCalled();
    });

    it('should include View Deployment button in Slack when URL provided', async () => {
      const slackWebhook = { ...mockWebhook, type: 'SLACK' };
      const payloadWithUrl: WebhookPayload = {
        ...mockPayload,
        deployment: {
          ...mockPayload.deployment!,
          url: 'https://app.kubidu.dev/deployment/123',
        },
      };
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 200, data: 'OK' }),
      );
      (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});
      (prisma.webhook.update as jest.Mock).mockResolvedValue({});

      await service.deliver(slackWebhook, 'deployment.success', payloadWithUrl);

      expect(httpService.post).toHaveBeenCalled();
    });

    it('should handle actor information in Discord embed', async () => {
      const discordWebhook = { ...mockWebhook, type: 'DISCORD' };
      const payloadWithActor: WebhookPayload = {
        ...mockPayload,
        actor: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
      };
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 200, data: 'OK' }),
      );
      (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});
      (prisma.webhook.update as jest.Mock).mockResolvedValue({});

      await service.deliver(discordWebhook, 'deployment.started', payloadWithActor);

      expect(httpService.post).toHaveBeenCalledWith(
        discordWebhook.url,
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              fields: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Triggered by',
                  value: 'John Doe',
                }),
              ]),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it('should format different event types correctly', async () => {
      const discordWebhook = { ...mockWebhook, type: 'DISCORD' };
      const events = [
        'deployment.failed',
        'deployment.started',
        'deployment.stopped',
        'build.success',
        'build.failed',
        'build.started',
        'service.created',
        'service.deleted',
        'domain.verified',
        'domain.added',
        'domain.removed',
        'service.updated',
      ];

      for (const event of events) {
        jest.clearAllMocks();
        (httpService.post as jest.Mock).mockReturnValue(
          of({ status: 200, data: 'OK' }),
        );
        (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});
        (prisma.webhook.update as jest.Mock).mockResolvedValue({});

        await service.deliver(discordWebhook, event, mockPayload);

        expect(httpService.post).toHaveBeenCalled();
      }
    });

    it('should use default color and icon for unknown events', async () => {
      const discordWebhook = { ...mockWebhook, type: 'DISCORD' };
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 200, data: 'OK' }),
      );
      (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});
      (prisma.webhook.update as jest.Mock).mockResolvedValue({});

      await service.deliver(discordWebhook, 'unknown.event', mockPayload);

      expect(httpService.post).toHaveBeenCalledWith(
        discordWebhook.url,
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              title: expect.stringContaining('📦'),
              color: 0x6b7280,
            }),
          ]),
        }),
        expect.any(Object),
      );
    });
  });

  describe('test', () => {
    it('should send test webhook delivery', async () => {
      const webhookWithProject = {
        ...mockWebhook,
        project: {
          id: 'project-123',
          name: 'Test Project',
          slug: 'test-project',
        },
      };
      (prisma.webhook.findUnique as jest.Mock).mockResolvedValue(webhookWithProject);
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 200, data: 'OK' }),
      );
      (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});
      (prisma.webhook.update as jest.Mock).mockResolvedValue({});

      const result = await service.test('webhook-123');

      expect(result).toBeDefined();
      expect(prisma.webhook.findUnique).toHaveBeenCalledWith({
        where: { id: 'webhook-123' },
        include: { project: true },
      });
      expect(httpService.post).toHaveBeenCalled();
    });

    it('should throw error when webhook not found', async () => {
      (prisma.webhook.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.test('non-existent')).rejects.toThrow('Webhook not found');
    });
  });
});
