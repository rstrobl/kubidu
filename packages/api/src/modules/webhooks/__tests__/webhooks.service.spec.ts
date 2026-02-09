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
  });
});
