import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsProcessor } from '../notifications.processor';
import { NotificationsService } from '../notifications.service';
import { PrismaService } from '../../../database/prisma.service';
import { Job } from 'bull';

describe('NotificationsProcessor', () => {
  let processor: NotificationsProcessor;
  let notificationsService: jest.Mocked<NotificationsService>;
  let prisma: jest.Mocked<PrismaService>;

  const mockJob = {
    data: {
      workspaceId: 'workspace-123',
      category: 'DEPLOYMENT',
      deploymentId: 'deployment-123',
      deploymentName: 'v1.0.0',
      deploymentStatus: 'COMPLETED',
      serviceId: 'service-123',
      serviceName: 'api-service',
      projectId: 'project-123',
      projectName: 'My Project',
    },
  } as Job<any>;

  const mockMembers = [
    { userId: 'user-1' },
    { userId: 'user-2' },
    { userId: 'user-3' },
  ];

  beforeEach(async () => {
    const mockNotificationsService = {
      notifyDeploymentStatus: jest.fn(),
      notifyBuildStatus: jest.fn(),
    };

    const mockPrisma = {
      workspaceMember: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsProcessor,
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    processor = module.get<NotificationsProcessor>(NotificationsProcessor);
    notificationsService = module.get(NotificationsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleDeploymentStatus', () => {
    it('should notify all workspace members about deployment status', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue(mockMembers);

      await processor.handleDeploymentStatus(mockJob);

      expect(prisma.workspaceMember.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 'workspace-123' },
        select: { userId: true },
      });

      expect(notificationsService.notifyDeploymentStatus).toHaveBeenCalledWith(
        'workspace-123',
        ['user-1', 'user-2', 'user-3'],
        {
          id: 'deployment-123',
          name: 'v1.0.0',
          status: 'COMPLETED',
        },
        {
          id: 'service-123',
          name: 'api-service',
        },
        {
          id: 'project-123',
          name: 'My Project',
        },
      );
    });

    it('should handle workspaces with no members', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([]);

      await processor.handleDeploymentStatus(mockJob);

      expect(notificationsService.notifyDeploymentStatus).not.toHaveBeenCalled();
    });

    it('should throw error when notification fails', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue(mockMembers);
      (notificationsService.notifyDeploymentStatus as jest.Mock).mockRejectedValue(
        new Error('Notification failed'),
      );

      await expect(processor.handleDeploymentStatus(mockJob)).rejects.toThrow('Notification failed');
    });
  });

  describe('handleBuildStatus', () => {
    const buildJob = {
      data: {
        ...mockJob.data,
        buildStatus: 'FAILED',
        errorMessage: 'Build failed due to syntax error',
      },
    } as Job<any>;

    it('should notify all workspace members about build status', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue(mockMembers);

      await processor.handleBuildStatus(buildJob);

      expect(notificationsService.notifyBuildStatus).toHaveBeenCalledWith(
        'workspace-123',
        ['user-1', 'user-2', 'user-3'],
        {
          status: 'FAILED',
          errorMessage: 'Build failed due to syntax error',
        },
        {
          id: 'deployment-123',
          name: 'v1.0.0',
        },
        {
          id: 'service-123',
          name: 'api-service',
        },
        {
          id: 'project-123',
          name: 'My Project',
        },
      );
    });

    it('should handle workspaces with no members', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([]);

      await processor.handleBuildStatus(buildJob);

      expect(notificationsService.notifyBuildStatus).not.toHaveBeenCalled();
    });

    it('should use default status when buildStatus is missing', async () => {
      const jobWithoutStatus = {
        data: {
          ...mockJob.data,
          buildStatus: undefined,
        },
      } as Job<any>;

      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue(mockMembers);

      await processor.handleBuildStatus(jobWithoutStatus);

      expect(notificationsService.notifyBuildStatus).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ status: 'FAILED' }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should throw error when build notification fails', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue(mockMembers);
      (notificationsService.notifyBuildStatus as jest.Mock).mockRejectedValue(
        new Error('Build notification failed'),
      );

      await expect(processor.handleBuildStatus(buildJob)).rejects.toThrow('Build notification failed');
    });
  });
});
