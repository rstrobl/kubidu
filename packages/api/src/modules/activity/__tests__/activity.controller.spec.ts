import { Test, TestingModule } from '@nestjs/testing';
import { ActivityController } from '../activity.controller';
import { ActivityService } from '../activity.service';
import { PrismaService } from '../../../database/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('ActivityController', () => {
  let controller: ActivityController;
  let activityService: ActivityService;
  let prisma: PrismaService;

  const mockActivityService = {
    getWorkspaceActivity: jest.fn(),
    getActivityStats: jest.fn(),
  };

  const mockPrisma = {
    workspaceMember: {
      findUnique: jest.fn(),
    },
  };

  const mockRequest = {
    user: { id: 'user-123', email: 'test@example.com' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [
        { provide: ActivityService, useValue: mockActivityService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ActivityController>(ActivityController);
    activityService = module.get(ActivityService);
    prisma = module.get(PrismaService);
  });

  describe('getActivity', () => {
    it('should return activity when user is workspace member', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue({
        userId: 'user-123',
        workspaceId: 'workspace-123',
        role: 'MEMBER',
      });
      mockActivityService.getWorkspaceActivity.mockResolvedValue({
        activities: [{ id: 'activity-1', type: 'DEPLOYMENT' }],
        total: 1,
      });

      const result = await controller.getActivity(
        mockRequest as any,
        'workspace-123',
        10,
        0,
        'project-123',
        'service-123',
        'DEPLOYMENT',
      );

      expect(result).toEqual({
        activities: [{ id: 'activity-1', type: 'DEPLOYMENT' }],
        total: 1,
      });
      expect(mockActivityService.getWorkspaceActivity).toHaveBeenCalledWith(
        'workspace-123',
        {
          limit: 10,
          offset: 0,
          projectId: 'project-123',
          serviceId: 'service-123',
          type: 'DEPLOYMENT',
        },
      );
    });

    it('should return empty when user is not workspace member', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(null);

      const result = await controller.getActivity(
        mockRequest as any,
        'workspace-123',
      );

      expect(result).toEqual({ activities: [], total: 0 });
      expect(mockActivityService.getWorkspaceActivity).not.toHaveBeenCalled();
    });

    it('should handle optional parameters', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue({
        userId: 'user-123',
        workspaceId: 'workspace-123',
        role: 'MEMBER',
      });
      mockActivityService.getWorkspaceActivity.mockResolvedValue({
        activities: [],
        total: 0,
      });

      await controller.getActivity(mockRequest as any, 'workspace-123');

      expect(mockActivityService.getWorkspaceActivity).toHaveBeenCalledWith(
        'workspace-123',
        {
          limit: undefined,
          offset: undefined,
          projectId: undefined,
          serviceId: undefined,
          type: undefined,
        },
      );
    });
  });

  describe('getStats', () => {
    it('should return stats when user is workspace member', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue({
        userId: 'user-123',
        workspaceId: 'workspace-123',
        role: 'MEMBER',
      });
      mockActivityService.getActivityStats.mockResolvedValue({
        deploymentsByStatus: { RUNNING: 5, FAILED: 2 },
        dailyDeployments: [{ date: '2024-01-01', count: 3 }],
        totalDeployments: 7,
        successRate: 0.71,
      });

      const result = await controller.getStats(
        mockRequest as any,
        'workspace-123',
        7,
      );

      expect(result).toEqual({
        deploymentsByStatus: { RUNNING: 5, FAILED: 2 },
        dailyDeployments: [{ date: '2024-01-01', count: 3 }],
        totalDeployments: 7,
        successRate: 0.71,
      });
      expect(mockActivityService.getActivityStats).toHaveBeenCalledWith(
        'workspace-123',
        7,
      );
    });

    it('should return empty stats when user is not workspace member', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(null);

      const result = await controller.getStats(
        mockRequest as any,
        'workspace-123',
      );

      expect(result).toEqual({
        deploymentsByStatus: {},
        dailyDeployments: [],
        totalDeployments: 0,
        successRate: 0,
      });
      expect(mockActivityService.getActivityStats).not.toHaveBeenCalled();
    });

    it('should use default 30 days when not specified', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue({
        userId: 'user-123',
        workspaceId: 'workspace-123',
        role: 'MEMBER',
      });
      mockActivityService.getActivityStats.mockResolvedValue({
        deploymentsByStatus: {},
        dailyDeployments: [],
        totalDeployments: 0,
        successRate: 0,
      });

      await controller.getStats(mockRequest as any, 'workspace-123');

      expect(mockActivityService.getActivityStats).toHaveBeenCalledWith(
        'workspace-123',
        30,
      );
    });
  });
});
