import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StatusPageService } from '../status-page.service';
import { PrismaService } from '../../../database/prisma.service';

describe('StatusPageService', () => {
  let service: StatusPageService;
  let prisma: jest.Mocked<PrismaService>;

  const mockWorkspace = { id: 'workspace-123', name: 'Test Workspace', slug: 'test-workspace' };
  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    slug: 'test-project',
    status: 'ACTIVE',
    workspace: mockWorkspace,
    services: [
      {
        id: 'service-1',
        name: 'API Service',
        status: 'ACTIVE',
        deployments: [
          { id: 'deployment-1', status: 'RUNNING', isActive: true, deployedAt: new Date() },
        ],
      },
      {
        id: 'service-2',
        name: 'Web Service',
        status: 'ACTIVE',
        deployments: [
          { id: 'deployment-2', status: 'DEPLOYING', isActive: true, deployedAt: new Date() },
        ],
      },
    ],
  };

  beforeEach(async () => {
    const mockPrisma = {
      project: {
        findFirst: jest.fn(),
      },
      incident: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusPageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StatusPageService>(StatusPageService);
    prisma = module.get(PrismaService);
  });

  describe('getPublicStatus', () => {
    it('should return status page for a project', async () => {
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.incident?.findMany as jest.Mock)?.mockResolvedValue?.([]);

      const result = await service.getPublicStatus('test-workspace', 'test-project');

      expect(result.project.id).toBe('project-123');
      expect(result.workspace.slug).toBe('test-workspace');
      expect(result.services).toHaveLength(2);
    });

    it('should calculate correct service statuses', async () => {
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);

      const result = await service.getPublicStatus('test-workspace', 'test-project');

      const apiService = result.services.find((s: any) => s.name === 'API Service');
      const webService = result.services.find((s: any) => s.name === 'Web Service');

      expect(apiService?.status).toBe('UP');
      expect(webService?.status).toBe('DEGRADED');
    });

    it('should throw NotFoundException when project not found', async () => {
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getPublicStatus('nonexistent', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return degraded overall status when some services are degraded', async () => {
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);

      const result = await service.getPublicStatus('test-workspace', 'test-project');

      expect(result.overallStatus).toBe('degraded');
    });

    it('should return operational when all services are up', async () => {
      const allUpProject = {
        ...mockProject,
        services: [
          {
            id: 'service-1',
            name: 'API Service',
            status: 'ACTIVE',
            deployments: [
              { id: 'deployment-1', status: 'RUNNING', isActive: true, deployedAt: new Date() },
            ],
          },
        ],
      };
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(allUpProject);

      const result = await service.getPublicStatus('test-workspace', 'test-project');

      expect(result.overallStatus).toBe('operational');
    });

    it('should return major_outage when all services are down', async () => {
      const allDownProject = {
        ...mockProject,
        services: [
          {
            id: 'service-1',
            name: 'API Service',
            status: 'ACTIVE',
            deployments: [],
          },
        ],
      };
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(allDownProject);

      const result = await service.getPublicStatus('test-workspace', 'test-project');

      expect(result.overallStatus).toBe('major_outage');
    });

    it('should include uptime data', async () => {
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);

      const result = await service.getPublicStatus('test-workspace', 'test-project');

      expect(result.uptimeData).toBeDefined();
      expect(result.uptimeData.length).toBe(30);
      expect(result.uptimePercentage).toBeGreaterThanOrEqual(0);
    });
  });
});
