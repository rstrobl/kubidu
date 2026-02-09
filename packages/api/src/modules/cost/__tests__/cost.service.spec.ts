import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CostService } from '../cost.service';
import { PrismaService } from '../../../database/prisma.service';

describe('CostService', () => {
  let service: CostService;
  let prisma: jest.Mocked<PrismaService>;

  const mockWorkspace = {
    id: 'workspace-123',
    name: 'Test Workspace',
    members: [{ userId: 'user-123' }],
    subscription: { plan: 'STARTER', status: 'ACTIVE' },
    projects: [
      {
        id: 'project-123',
        name: 'Test Project',
        status: 'ACTIVE',
        services: [
          {
            id: 'service-123',
            name: 'Test Service',
            status: 'ACTIVE',
            defaultCpuLimit: '500m',
            defaultMemoryLimit: '512Mi',
            deployments: [
              {
                id: 'deployment-123',
                isActive: true,
                cpuLimit: '500m',
                memoryLimit: '512Mi',
              },
            ],
            volumes: [{ size: '1Gi' }],
          },
        ],
      },
    ],
  };

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    workspace: {
      members: [{ userId: 'user-123' }],
      subscription: { plan: 'STARTER' },
    },
    services: [
      {
        id: 'service-123',
        name: 'Test Service',
        defaultCpuLimit: '500m',
        defaultMemoryLimit: '512Mi',
        deployments: [
          {
            cpuLimit: '500m',
            memoryLimit: '512Mi',
          },
        ],
        volumes: [],
      },
    ],
  };

  beforeEach(async () => {
    const mockPrisma = {
      workspace: {
        findUnique: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CostService>(CostService);
    prisma = module.get(PrismaService);
  });

  describe('getCostEstimate', () => {
    it('should return cost breakdown for a workspace', async () => {
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspace);

      const result = await service.getCostEstimate('workspace-123', 'user-123');

      expect(result.workspace.id).toBe('workspace-123');
      expect(result.workspace.plan).toBe('Starter');
      expect(result.billing.basePrice).toBe(9);
      expect(result.services).toHaveLength(1);
    });

    it('should throw NotFoundException when workspace not found', async () => {
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getCostEstimate('nonexistent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user is not a member', async () => {
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
        ...mockWorkspace,
        members: [],
      });

      await expect(
        service.getCostEstimate('workspace-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate service costs correctly', async () => {
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspace);

      const result = await service.getCostEstimate('workspace-123', 'user-123');

      const serviceCost = result.services[0];
      expect(serviceCost.cpuCores).toBe(0.5); // 500m = 0.5 cores
      expect(serviceCost.memoryGB).toBe(0.5); // 512Mi = 0.5 GB
      expect(serviceCost.storageGB).toBe(1); // 1Gi = 1 GB
    });

    it('should generate recommendations', async () => {
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspace);

      const result = await service.getCostEstimate('workspace-123', 'user-123');

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should use FREE plan when no subscription', async () => {
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
        ...mockWorkspace,
        subscription: null,
      });

      const result = await service.getCostEstimate('workspace-123', 'user-123');

      expect(result.workspace.plan).toBe('Hobby');
      expect(result.billing.basePrice).toBe(0);
    });
  });

  describe('getProjectCost', () => {
    it('should return cost breakdown for a project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const result = await service.getProjectCost('project-123', 'user-123');

      expect(result.project.id).toBe('project-123');
      expect(result.services).toHaveLength(1);
      expect(result.currency).toBe('USD');
    });

    it('should throw NotFoundException when project not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getProjectCost('nonexistent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user is not a workspace member', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        ...mockProject,
        workspace: { ...mockProject.workspace, members: [] },
      });

      await expect(
        service.getProjectCost('project-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate total monthly cost', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const result = await service.getProjectCost('project-123', 'user-123');

      expect(result.totalMonthlyCost).toBeGreaterThanOrEqual(0);
    });
  });
});
