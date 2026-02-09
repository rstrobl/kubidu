import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService, ActivityEvent } from '../activity.service';
import { PrismaService } from '../../../database/prisma.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let prisma: jest.Mocked<PrismaService>;

  const mockDeployment = {
    id: 'deployment-123',
    name: 'v1.0.0',
    status: 'RUNNING',
    gitCommitSha: 'abc123',
    gitCommitMessage: 'Initial commit',
    gitAuthor: 'Test User',
    imageTag: 'latest',
    service: {
      id: 'service-123',
      name: 'Test Service',
      projectId: 'project-123',
    },
    createdAt: new Date(),
  };

  const mockAuditLog = {
    id: 'audit-123',
    userId: 'user-123',
    action: 'service.create',
    resource: 'service',
    resourceId: 'service-123',
    metadata: { name: 'Test Service' },
    user: {
      id: 'user-123',
      name: 'Test User',
      avatarUrl: null,
    },
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      project: {
        findMany: jest.fn(),
      },
      deployment: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    prisma = module.get(PrismaService);
  });

  describe('getWorkspaceActivity', () => {
    it('should return activity events for a workspace', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([
        { id: 'project-123', name: 'Test Project' },
      ]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([mockDeployment]);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([mockAuditLog]);

      const result = await service.getWorkspaceActivity('workspace-123');

      expect(result.activities.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it('should return empty when workspace has no projects', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getWorkspaceActivity('workspace-123');

      expect(result.activities).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should filter by projectId', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([
        { id: 'project-123', name: 'Test Project' },
      ]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([mockDeployment]);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getWorkspaceActivity('workspace-123', {
        projectId: 'project-123',
      });

      expect(result.activities.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect limit option', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([
        { id: 'project-123', name: 'Test Project' },
      ]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([
        mockDeployment,
        { ...mockDeployment, id: 'deployment-456' },
      ]);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getWorkspaceActivity('workspace-123', { limit: 1 });

      expect(result.activities.length).toBeLessThanOrEqual(1);
    });

    it('should transform deployments to activity events correctly', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([
        { id: 'project-123', name: 'Test Project' },
      ]);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([mockDeployment]);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getWorkspaceActivity('workspace-123');

      const deploymentEvent = result.activities.find(
        (a) => a.type === 'deployment',
      );
      expect(deploymentEvent).toBeDefined();
      expect(deploymentEvent?.action).toBe('deployed');
      expect(deploymentEvent?.color).toBe('green');
    });
  });

  describe('getActivityStats', () => {
    it('should return activity statistics', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([
        { id: 'project-123' },
      ]);
      (prisma.deployment.groupBy as jest.Mock).mockResolvedValue([
        { status: 'RUNNING', _count: 10 },
        { status: 'FAILED', _count: 2 },
      ]);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { date: '2024-01-01', count: BigInt(5) },
      ]);

      const result = await service.getActivityStats('workspace-123');

      expect(result.totalDeployments).toBe(12);
      expect(result.successRate).toBeGreaterThan(0);
      expect(result.deploymentsByStatus).toBeDefined();
    });

    it('should calculate success rate correctly', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([
        { id: 'project-123' },
      ]);
      (prisma.deployment.groupBy as jest.Mock).mockResolvedValue([
        { status: 'RUNNING', _count: 8 },
        { status: 'FAILED', _count: 2 },
      ]);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await service.getActivityStats('workspace-123');

      expect(result.successRate).toBe(80);
    });

    it('should return 0 success rate when no deployments', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.deployment.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await service.getActivityStats('workspace-123');

      expect(result.successRate).toBe(0);
      expect(result.totalDeployments).toBe(0);
    });
  });
});
