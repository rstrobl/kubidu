import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
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
    const mockPrisma: any = {
      project: {
        findFirst: jest.fn(),
      },
      incident: {
        findMany: jest.fn().mockResolvedValue([]),
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
      (prisma.$queryRaw as jest.Mock) = jest.fn().mockResolvedValue([]);

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

    it('should handle services with FAILED deployment status', async () => {
      const failedProject = {
        ...mockProject,
        services: [
          {
            id: 'service-1',
            name: 'API Service',
            status: 'ACTIVE',
            deployments: [
              { id: 'deployment-1', status: 'FAILED', isActive: true, deployedAt: new Date() },
            ],
          },
        ],
      };
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(failedProject);

      const result = await service.getPublicStatus('test-workspace', 'test-project');

      expect(result.services[0].status).toBe('DOWN');
      expect(result.overallStatus).toBe('major_outage');
    });

    it('should return partial_outage when some services are down', async () => {
      const partialOutageProject = {
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
          {
            id: 'service-2',
            name: 'DB Service',
            status: 'ACTIVE',
            deployments: [
              { id: 'deployment-2', status: 'FAILED', isActive: true, deployedAt: new Date() },
            ],
          },
        ],
      };
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(partialOutageProject);

      const result = await service.getPublicStatus('test-workspace', 'test-project');

      expect(result.overallStatus).toBe('partial_outage');
    });
  });

  describe('subscribe', () => {
    it('should subscribe email to status updates', async () => {
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.$executeRaw as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await service.subscribe('test-workspace', 'test-project', 'test@example.com');

      expect(result.message).toBe('Subscription request received. Check your email to confirm.');
    });

    it('should throw NotFoundException when project not found', async () => {
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.subscribe('nonexistent', 'nonexistent', 'test@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid email', async () => {
      const { BadRequestException } = jest.requireActual('@nestjs/common');
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);

      await expect(
        service.subscribe('test-workspace', 'test-project', 'invalid-email'),
      ).rejects.toThrow('Invalid email address');
    });

    it('should handle database errors gracefully', async () => {
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.$executeRaw as jest.Mock) = jest.fn().mockRejectedValue(new Error('DB error'));

      const result = await service.subscribe('test-workspace', 'test-project', 'test@example.com');

      expect(result.message).toBeDefined();
    });
  });

  describe('confirmSubscription', () => {
    it('should confirm a valid subscription token', async () => {
      (prisma.$executeRaw as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await service.confirmSubscription('valid-token');

      expect(result.message).toBe('Subscription confirmed successfully');
    });

    it('should throw NotFoundException for invalid token', async () => {
      (prisma.$executeRaw as jest.Mock) = jest.fn().mockResolvedValue(0);

      await expect(
        service.confirmSubscription('invalid-token'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException on database error', async () => {
      (prisma.$executeRaw as jest.Mock) = jest.fn().mockRejectedValue(new Error('DB error'));

      await expect(
        service.confirmSubscription('any-token'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createIncident', () => {
    it('should create a new incident', async () => {
      (prisma.$executeRaw as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await service.createIncident('project-123', 'user-123', {
        title: 'Database Outage',
        message: 'Investigating database connectivity issues',
        severity: 'MAJOR',
        affectedServiceIds: ['service-1', 'service-2'],
      });

      expect(result.message).toBe('Incident created');
    });
  });

  describe('updateIncident', () => {
    it('should update an incident status', async () => {
      (prisma.$executeRaw as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await service.updateIncident('incident-123', {
        status: 'IDENTIFIED',
        message: 'Root cause identified',
      });

      expect(result.message).toBe('Incident updated');
    });

    it('should update incident to RESOLVED', async () => {
      (prisma.$executeRaw as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await service.updateIncident('incident-123', {
        status: 'RESOLVED',
        message: 'Issue has been resolved',
      });

      expect(result.message).toBe('Incident updated');
    });

    it('should update incident without message', async () => {
      (prisma.$executeRaw as jest.Mock) = jest.fn().mockResolvedValue(1);

      const result = await service.updateIncident('incident-123', {
        status: 'MONITORING',
      });

      expect(result.message).toBe('Incident updated');
    });
  });

  describe('getRecentIncidents', () => {
    it('should return recent incidents', async () => {
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.$queryRaw as jest.Mock) = jest.fn().mockResolvedValue([
        {
          id: 'incident-1',
          title: 'API Outage',
          status: 'RESOLVED',
          severity: 'MAJOR',
          createdAt: new Date(),
          resolvedAt: new Date(),
        },
      ]);

      const result = await service.getPublicStatus('test-workspace', 'test-project');

      // Incidents are loaded as part of public status
      expect(result).toBeDefined();
    });

    it('should handle missing incidents table gracefully', async () => {
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.$queryRaw as jest.Mock) = jest.fn().mockRejectedValue(new Error('Table not found'));

      const result = await service.getPublicStatus('test-workspace', 'test-project');

      expect(result.incidents).toEqual([]);
    });
  });
});
