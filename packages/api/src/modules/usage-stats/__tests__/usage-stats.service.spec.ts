import { Test, TestingModule } from '@nestjs/testing';
import { UsageStatsService } from '../usage-stats.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';

describe('UsageStatsService', () => {
  let service: UsageStatsService;
  let prisma: jest.Mocked<PrismaService>;
  let authorizationService: jest.Mocked<AuthorizationService>;
  let httpService: jest.Mocked<HttpService>;

  const mockProject = {
    id: 'project-123',
    workspaceId: 'workspace-123',
  };

  const mockService = {
    id: 'service-123',
    projectId: 'project-123',
    defaultCpuLimit: '100m',
    defaultMemoryLimit: '128Mi',
    defaultReplicas: 1,
    deployments: [
      {
        id: 'deployment-123',
        status: 'RUNNING',
        cpuLimit: '100m',
        memoryLimit: '128Mi',
        replicas: 1,
        deployedAt: new Date(Date.now() - 3600000),
      },
    ],
  };

  beforeEach(async () => {
    const mockPrisma = {
      project: {
        findUnique: jest.fn(),
      },
      service: {
        findMany: jest.fn(),
      },
      buildQueue: {
        aggregate: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn(),
      },
    };

    const mockAuthorizationService = {
      checkWorkspaceAccessViaProject: jest.fn(),
    };

    const mockHttpService = {
      get: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('http://deploy-controller:3002'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageStatsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthorizationService, useValue: mockAuthorizationService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UsageStatsService>(UsageStatsService);
    prisma = module.get(PrismaService);
    authorizationService = module.get(AuthorizationService);
    httpService = module.get(HttpService);
  });

  describe('getAllocationStats', () => {
    it('should return allocation stats for a project', async () => {
      (authorizationService.checkWorkspaceAccessViaProject as jest.Mock).mockResolvedValue({
        workspaceId: 'workspace-123',
      });
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockService]);
      (prisma.buildQueue.aggregate as jest.Mock).mockResolvedValue({
        _sum: { buildDurationSeconds: 600 },
      });
      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        plan: 'STARTER',
        status: 'ACTIVE',
      });

      const result = await service.getAllocationStats('user-123', 'project-123');

      expect(result.serviceCount).toBe(1);
      expect(result.activeDeploymentCount).toBe(1);
      expect(result.buildMinutesUsed).toBe(10);
      expect(result.plan).toBeDefined();
    });

    it('should handle projects with no services', async () => {
      (authorizationService.checkWorkspaceAccessViaProject as jest.Mock).mockResolvedValue({
        workspaceId: 'workspace-123',
      });
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getAllocationStats('user-123', 'project-123');

      expect(result.serviceCount).toBe(0);
      expect(result.activeDeploymentCount).toBe(0);
    });
  });

  describe('getLiveMetrics', () => {
    it('should fetch live metrics from deploy controller', async () => {
      (authorizationService.checkWorkspaceAccessViaProject as jest.Mock).mockResolvedValue({
        workspaceId: 'workspace-123',
      });
      (httpService.get as jest.Mock).mockReturnValue(
        of({
          data: {
            cpuUsage: 50,
            memoryUsage: 60,
          },
        }),
      );

      const result = await service.getLiveMetrics('user-123', 'project-123');

      expect(result).toBeDefined();
      expect(result?.cpuUsage).toBe(50);
    });

    it('should return null when deploy controller is unavailable', async () => {
      (authorizationService.checkWorkspaceAccessViaProject as jest.Mock).mockResolvedValue({
        workspaceId: 'workspace-123',
      });
      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      const result = await service.getLiveMetrics('user-123', 'project-123');

      expect(result).toBeNull();
    });
  });
});
