import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { getQueueToken } from '@nestjs/bull';
import { of, throwError } from 'rxjs';
import { DeploymentStatus } from '@kubidu/shared';
import { DeploymentsService } from '../deployments.service';
import { PrismaService } from '../../../database/prisma.service';

describe('DeploymentsService', () => {
  let service: DeploymentsService;
  let prisma: jest.Mocked<PrismaService>;
  let deployQueue: { add: jest.Mock };
  let httpService: jest.Mocked<HttpService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockWorkspace = {
    id: 'workspace-123',
    name: 'Test Workspace',
  };

  const mockProject = {
    id: 'project-123',
    workspaceId: mockWorkspace.id,
    name: 'Test Project',
  };

  const mockService = {
    id: 'service-123',
    projectId: mockProject.id,
    name: 'TestService',
    dockerImage: 'nginx',
    dockerTag: 'latest',
    defaultPort: 80,
    defaultReplicas: 1,
    defaultCpuLimit: '500m',
    defaultMemoryLimit: '512Mi',
    defaultCpuRequest: '100m',
    defaultMemoryRequest: '128Mi',
    defaultHealthCheckPath: '/health',
    project: mockProject,
  };

  const mockDeployment = {
    id: 'deployment-123',
    serviceId: mockService.id,
    name: 'testservice-1234567890',
    status: 'PENDING',
    imageUrl: 'nginx',
    imageTag: 'latest',
    port: 80,
    replicas: 1,
    cpuLimit: '500m',
    memoryLimit: '512Mi',
    cpuRequest: '100m',
    memoryRequest: '128Mi',
    healthCheckPath: '/health',
    buildLogs: null,
    deploymentLogs: null,
    stoppedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    service: mockService,
  };

  const mockMembership = {
    userId: mockUser.id,
    workspaceId: mockWorkspace.id,
    role: 'MEMBER',
  };

  beforeEach(async () => {
    const mockPrisma = {
      service: {
        findUnique: jest.fn(),
      },
      deployment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      workspaceMember: {
        findUnique: jest.fn(),
      },
    };

    deployQueue = {
      add: jest.fn().mockResolvedValue({}),
    };

    const mockHttpService = {
      get: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('http://deploy-controller:3002'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('deploy'), useValue: deployQueue },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DeploymentsService>(DeploymentsService);
    prisma = module.get(PrismaService);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      serviceId: mockService.id,
      port: 80,
      replicas: 1,
    };

    it('should create a deployment and enqueue deploy job', async () => {
      (prisma.service.findUnique as jest.Mock)
        .mockResolvedValueOnce({ ...mockService, project: mockProject })
        .mockResolvedValueOnce(mockService);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.deployment.create as jest.Mock).mockResolvedValue(mockDeployment);

      const result = await service.create(mockUser.id, createDto);

      expect(result.id).toBe(mockDeployment.id);
      expect(result.status).toBe('PENDING');
      expect(prisma.deployment.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when service does not exist', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(mockUser.id, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a workspace member', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue({
        ...mockService,
        project: mockProject,
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(mockUser.id, createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for viewer role', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue({
        ...mockService,
        project: mockProject,
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: 'VIEWER',
      });

      await expect(service.create(mockUser.id, createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow ADMIN role to create deployment', async () => {
      (prisma.service.findUnique as jest.Mock)
        .mockResolvedValueOnce({ ...mockService, project: mockProject })
        .mockResolvedValueOnce(mockService);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: 'ADMIN',
      });
      (prisma.deployment.create as jest.Mock).mockResolvedValue(mockDeployment);

      const result = await service.create(mockUser.id, createDto);

      expect(result.id).toBe(mockDeployment.id);
    });

    it('should allow DEPLOYER role to create deployment', async () => {
      (prisma.service.findUnique as jest.Mock)
        .mockResolvedValueOnce({ ...mockService, project: mockProject })
        .mockResolvedValueOnce(mockService);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: 'DEPLOYER',
      });
      (prisma.deployment.create as jest.Mock).mockResolvedValue(mockDeployment);

      const result = await service.create(mockUser.id, createDto);

      expect(result.id).toBe(mockDeployment.id);
    });

    it('should lowercase service name in deployment name', async () => {
      const upperCaseService = {
        ...mockService,
        name: 'MyUpperCaseService',
        project: mockProject,
      };
      (prisma.service.findUnique as jest.Mock)
        .mockResolvedValueOnce(upperCaseService)
        .mockResolvedValueOnce(upperCaseService);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.deployment.create as jest.Mock).mockResolvedValue(mockDeployment);

      await service.create(mockUser.id, createDto);

      expect(prisma.deployment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: expect.stringMatching(/^myuppercaseservice-\d+$/),
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return deployments for a service', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue({
        ...mockService,
        project: mockProject,
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([mockDeployment]);

      const result = await service.findAll(mockUser.id, mockService.id);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockDeployment.id);
    });

    it('should throw NotFoundException when service does not exist', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findAll(mockUser.id, 'nonexistent-service'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not a workspace member', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue({
        ...mockService,
        project: mockProject,
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findAll(mockUser.id, mockService.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when no workspace can be determined', async () => {
      await expect(service.findAll(mockUser.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should enrich running deployments with pod status', async () => {
      const runningDeployment = { ...mockDeployment, status: 'RUNNING' };
      (prisma.service.findUnique as jest.Mock).mockResolvedValue({
        ...mockService,
        project: mockProject,
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([runningDeployment]);
      (httpService.get as jest.Mock).mockReturnValue(
        of({ data: { ready: true, podCount: 1 } }),
      );

      const result = await service.findAll(mockUser.id, mockService.id);

      expect(result[0].podStatus).toEqual({ ready: true, podCount: 1 });
    });

    it('should return deployments without pod status if API call fails', async () => {
      const runningDeployment = { ...mockDeployment, status: 'RUNNING' };
      (prisma.service.findUnique as jest.Mock).mockResolvedValue({
        ...mockService,
        project: mockProject,
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.deployment.findMany as jest.Mock).mockResolvedValue([runningDeployment]);
      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      const result = await service.findAll(mockUser.id, mockService.id);

      expect(result[0].id).toBe(mockDeployment.id);
      expect(result[0].podStatus).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('should return a deployment by id', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        service: { ...mockService, project: mockProject },
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const result = await service.findOne(mockUser.id, mockDeployment.id);

      expect(result.id).toBe(mockDeployment.id);
    });

    it('should throw NotFoundException when deployment does not exist', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOne(mockUser.id, 'nonexistent-deployment'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not a workspace member', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        service: { ...mockService, project: mockProject },
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOne(mockUser.id, mockDeployment.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update deployment status', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        service: { ...mockService, project: mockProject },
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.deployment.update as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        status: DeploymentStatus.RUNNING,
      });

      const result = await service.update(mockUser.id, mockDeployment.id, {
        status: DeploymentStatus.RUNNING,
      });

      expect(result.status).toBe('RUNNING');
    });

    it('should update image tag', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        service: { ...mockService, project: mockProject },
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.deployment.update as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        imageTag: 'v2.0.0',
      });

      const result = await service.update(mockUser.id, mockDeployment.id, {
        imageTag: 'v2.0.0',
      });

      expect(result.imageTag).toBe('v2.0.0');
    });
  });

  describe('stop', () => {
    it('should stop a deployment', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        service: { ...mockService, project: mockProject },
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.deployment.update as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        status: 'STOPPED',
        stoppedAt: new Date(),
      });

      await service.stop(mockUser.id, mockDeployment.id);

      expect(prisma.deployment.update).toHaveBeenCalledWith({
        where: { id: mockDeployment.id },
        data: {
          status: 'STOPPED',
          stoppedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException for nonexistent deployment', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.stop(mockUser.id, 'nonexistent-deployment'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('restart', () => {
    it('should restart a deployment and enqueue job', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        status: 'STOPPED',
        service: { ...mockService, project: mockProject },
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.deployment.update as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        status: 'PENDING',
      });

      await service.restart(mockUser.id, mockDeployment.id);

      expect(prisma.deployment.update).toHaveBeenCalledWith({
        where: { id: mockDeployment.id },
        data: { status: 'PENDING' },
      });
    });
  });

  describe('retry', () => {
    it('should retry a failed deployment with updated service defaults', async () => {
      const failedDeployment = {
        ...mockDeployment,
        status: 'FAILED',
        deploymentLogs: 'Error: deployment failed',
        service: { ...mockService, project: mockProject },
      };
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(failedDeployment);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.deployment.update as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        status: 'PENDING',
        deploymentLogs: null,
      });

      await service.retry(mockUser.id, mockDeployment.id);

      expect(prisma.deployment.update).toHaveBeenCalledWith({
        where: { id: mockDeployment.id },
        data: expect.objectContaining({
          status: 'PENDING',
          deploymentLogs: null,
          stoppedAt: null,
          port: mockService.defaultPort,
          replicas: mockService.defaultReplicas,
        }),
      });
    });
  });

  describe('getLogs', () => {
    it('should return logs from Kubernetes', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        service: { ...mockService, project: mockProject },
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (httpService.get as jest.Mock).mockReturnValue(
        of({ data: { logs: 'Container started successfully' } }),
      );

      const result = await service.getLogs(mockUser.id, mockDeployment.id);

      expect(result).toBe('Container started successfully');
    });

    it('should fallback to stored logs when Kubernetes API fails', async () => {
      const deploymentWithLogs = {
        ...mockDeployment,
        deploymentLogs: 'Stored deployment logs',
        service: { ...mockService, project: mockProject },
      };
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(deploymentWithLogs);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      const result = await service.getLogs(mockUser.id, mockDeployment.id);

      expect(result).toBe('Stored deployment logs');
    });

    it('should return "No logs available" when no logs exist', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        deploymentLogs: null,
        service: { ...mockService, project: mockProject },
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      const result = await service.getLogs(mockUser.id, mockDeployment.id);

      expect(result).toBe('No logs available');
    });

    it('should limit logs to tail parameter', async () => {
      const multiLineLogs = 'line1\nline2\nline3\nline4\nline5';
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        deploymentLogs: multiLineLogs,
        service: { ...mockService, project: mockProject },
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      const result = await service.getLogs(mockUser.id, mockDeployment.id, 2);

      expect(result).toBe('line4\nline5');
    });
  });

  describe('getBuildLogs', () => {
    it('should return build logs', async () => {
      const deploymentWithBuildLogs = {
        ...mockDeployment,
        buildLogs: 'Building image...\nPushing to registry...',
        service: { ...mockService, project: mockProject },
      };
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue(deploymentWithBuildLogs);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const result = await service.getBuildLogs(mockUser.id, mockDeployment.id);

      expect(result).toBe('Building image...\nPushing to registry...');
    });

    it('should return default message when no build logs exist', async () => {
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        buildLogs: null,
        service: { ...mockService, project: mockProject },
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const result = await service.getBuildLogs(mockUser.id, mockDeployment.id);

      expect(result).toBe('No build logs available yet');
    });

    it('should limit build logs to tail parameter', async () => {
      const multiLineLogs = 'step1\nstep2\nstep3\nstep4';
      (prisma.deployment.findUnique as jest.Mock).mockResolvedValue({
        ...mockDeployment,
        buildLogs: multiLineLogs,
        service: { ...mockService, project: mockProject },
      });
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const result = await service.getBuildLogs(mockUser.id, mockDeployment.id, 2);

      expect(result).toBe('step3\nstep4');
    });
  });
});
