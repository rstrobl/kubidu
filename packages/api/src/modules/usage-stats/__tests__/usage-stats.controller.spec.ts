import { Test, TestingModule } from '@nestjs/testing';
import { UsageStatsController } from '../usage-stats.controller';
import { UsageStatsService } from '../usage-stats.service';

describe('UsageStatsController', () => {
  let controller: UsageStatsController;
  let usageStatsService: jest.Mocked<UsageStatsService>;

  const mockAllocationStats = {
    serviceCount: 5,
    activeDeploymentCount: 3,
    totalDeploymentCount: 10,
    buildMinutesUsed: 120,
    allocatedCpuMillicores: 2000,
    allocatedMemoryBytes: 1024 * 1024 * 1024,
    uptimeSeconds: 86400,
    plan: { name: 'Pro', limits: {} },
  };

  const mockLiveMetrics = {
    deployments: [],
    totalCpuUsageMillicores: 500,
    totalMemoryUsageBytes: 1024 * 1024 * 512,
  };

  beforeEach(async () => {
    const mockUsageStatsService = {
      getAllocationStats: jest.fn(),
      getLiveMetrics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsageStatsController],
      providers: [
        { provide: UsageStatsService, useValue: mockUsageStatsService },
      ],
    }).compile();

    controller = module.get<UsageStatsController>(UsageStatsController);
    usageStatsService = module.get(UsageStatsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllocationStats', () => {
    it('should return allocation stats for a project', async () => {
      usageStatsService.getAllocationStats.mockResolvedValue(mockAllocationStats as any);

      const result = await controller.getAllocationStats(
        { user: { id: 'user-123' } },
        'project-123',
      );

      expect(result).toEqual(mockAllocationStats);
      expect(usageStatsService.getAllocationStats).toHaveBeenCalledWith('user-123', 'project-123');
    });
  });

  describe('getLiveMetrics', () => {
    it('should return live metrics for a project', async () => {
      usageStatsService.getLiveMetrics.mockResolvedValue(mockLiveMetrics as any);

      const result = await controller.getLiveMetrics(
        { user: { id: 'user-123' } },
        'project-123',
      );

      expect(result).toEqual(mockLiveMetrics);
      expect(usageStatsService.getLiveMetrics).toHaveBeenCalledWith('user-123', 'project-123');
    });

    it('should return null when metrics unavailable', async () => {
      usageStatsService.getLiveMetrics.mockResolvedValue(null);

      const result = await controller.getLiveMetrics(
        { user: { id: 'user-123' } },
        'project-123',
      );

      expect(result).toBeNull();
    });
  });
});
