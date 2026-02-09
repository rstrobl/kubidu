import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from '../webhooks.controller';
import { WebhooksService, WEBHOOK_EVENTS } from '../webhooks.service';
import { PrismaService } from '../../../database/prisma.service';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let webhooksService: jest.Mocked<WebhooksService>;
  let prisma: jest.Mocked<PrismaService>;

  const mockWebhook = {
    id: 'webhook-123',
    projectId: 'project-123',
    name: 'Discord Notifications',
    url: 'https://discord.com/api/webhooks/xxx',
    type: 'DISCORD',
    events: ['deployment.success', 'deployment.failed'],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProject = {
    id: 'project-123',
    workspaceId: 'workspace-123',
    workspace: {
      members: [{ userId: 'user-123' }],
    },
  };

  beforeEach(async () => {
    const mockWebhooksService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      testWebhook: jest.fn(),
    };

    const mockPrisma = {
      project: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: WebhooksService, useValue: mockWebhooksService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    webhooksService = module.get(WebhooksService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all webhooks for a project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      webhooksService.findAll.mockResolvedValue([mockWebhook] as any);

      const result = await controller.findAll(
        { user: { id: 'user-123' } },
        'project-123',
      );

      expect(result).toHaveLength(1);
      expect(webhooksService.findAll).toHaveBeenCalledWith('project-123');
    });
  });

  describe('getEvents', () => {
    it('should return available webhook events', async () => {
      const result = await controller.getEvents();

      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('categories');
      expect(result.categories).toHaveProperty('deployment');
      expect(result.categories).toHaveProperty('build');
    });
  });

  describe('findOne', () => {
    it('should return a webhook by id', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      webhooksService.findOne.mockResolvedValue(mockWebhook as any);

      const result = await controller.findOne(
        { user: { id: 'user-123' } },
        'project-123',
        'webhook-123',
      );

      expect(result).toEqual(mockWebhook);
      expect(webhooksService.findOne).toHaveBeenCalledWith('webhook-123');
    });
  });

  describe('create', () => {
    it('should create a new webhook', async () => {
      const createDto = {
        name: 'New Webhook',
        url: 'https://example.com/webhook',
        events: ['deployment.success'],
      };
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      webhooksService.create.mockResolvedValue(mockWebhook as any);

      const result = await controller.create(
        { user: { id: 'user-123' } },
        'project-123',
        createDto as any,
      );

      expect(result).toEqual(mockWebhook);
      expect(webhooksService.create).toHaveBeenCalledWith('project-123', createDto);
    });
  });

  describe('update', () => {
    it('should update a webhook', async () => {
      const updateDto = { name: 'Updated Webhook' };
      const updatedWebhook = { ...mockWebhook, name: 'Updated Webhook' };
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      webhooksService.findOne.mockResolvedValue(mockWebhook as any);
      webhooksService.update.mockResolvedValue(updatedWebhook as any);

      const result = await controller.update(
        { user: { id: 'user-123' } },
        'project-123',
        'webhook-123',
        updateDto as any,
      );

      expect(result.name).toBe('Updated Webhook');
      expect(webhooksService.update).toHaveBeenCalledWith('webhook-123', updateDto);
    });
  });

  describe('delete', () => {
    it('should delete a webhook', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      webhooksService.findOne.mockResolvedValue(mockWebhook as any);
      webhooksService.delete.mockResolvedValue(undefined);

      await controller.delete(
        { user: { id: 'user-123' } },
        'project-123',
        'webhook-123',
      );

      expect(webhooksService.delete).toHaveBeenCalledWith('webhook-123');
    });
  });
});
