import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import { ServiceType } from '@kubidu/shared';
import { ServicesService } from '../services.service';
import { PrismaService } from '../../../database/prisma.service';
import { EncryptionService } from '../../../services/encryption.service';
import { DockerInspectorService } from '../docker-inspector.service';
import { DeploymentsService } from '../../deployments/deployments.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { GitHubAppService } from '../../github/github-app.service';

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: jest.Mocked<PrismaService>;
  let deploymentsService: jest.Mocked<DeploymentsService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let dockerInspector: jest.Mocked<DockerInspectorService>;
  let encryptionService: jest.Mocked<EncryptionService>;
  let buildQueue: { add: jest.Mock };

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
    serviceType: 'DOCKER_IMAGE',
    dockerImage: 'nginx',
    dockerTag: 'latest',
    defaultPort: 80,
    defaultReplicas: 1,
    defaultCpuLimit: '1000m',
    defaultMemoryLimit: '512Mi',
    defaultCpuRequest: '100m',
    defaultMemoryRequest: '128Mi',
    defaultHealthCheckPath: '/',
    autoDeploy: true,
    status: 'ACTIVE',
    subdomain: null,
    url: null,
    canvasX: null,
    canvasY: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    project: mockProject,
  };

  const mockMembership = {
    userId: mockUser.id,
    workspaceId: mockWorkspace.id,
    role: 'MEMBER',
  };

  beforeEach(async () => {
    const mockPrisma = {
      project: {
        findUnique: jest.fn(),
      },
      service: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      workspaceMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      volume: {
        findMany: jest.fn(),
      },
      environmentVariable: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      deployment: {
        create: jest.fn(),
      },
      gitHubInstallation: {
        findUnique: jest.fn(),
      },
      buildQueue: {
        create: jest.fn(),
      },
    };

    buildQueue = {
      add: jest.fn().mockResolvedValue({}),
    };

    const deployQueue = {
      add: jest.fn().mockResolvedValue({}),
    };

    const mockDeploymentsService = {
      create: jest.fn().mockResolvedValue({ id: 'deployment-123' }),
    };

    const mockNotificationsService = {
      notifyServiceEvent: jest.fn().mockResolvedValue(undefined),
    };

    const mockEncryptionService = {
      encrypt: jest.fn().mockReturnValue({
        encrypted: 'encrypted-value',
        iv: 'test-iv',
        authTag: 'test-tag',
      }),
    };

    const mockDockerInspector = {
      getExposedPort: jest.fn().mockResolvedValue(null),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:5000'),
    };

    const mockGitHubAppService = {
      getLatestCommit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('build'), useValue: buildQueue },
        { provide: getQueueToken('deploy'), useValue: deployQueue },
        { provide: DeploymentsService, useValue: mockDeploymentsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DockerInspectorService, useValue: mockDockerInspector },
        { provide: GitHubAppService, useValue: mockGitHubAppService },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    prisma = module.get(PrismaService);
    deploymentsService = module.get(DeploymentsService);
    notificationsService = module.get(NotificationsService);
    dockerInspector = module.get(DockerInspectorService);
    encryptionService = module.get(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'NewService',
      serviceType: ServiceType.DOCKER_IMAGE,
      dockerImage: 'nginx',
      dockerTag: 'latest',
    };

    it('should create a Docker image service and auto-deploy', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.service.create as jest.Mock).mockResolvedValue(mockService);
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.create(mockUser.id, mockProject.id, createDto);

      expect(result.id).toBe(mockService.id);
      expect(prisma.service.create).toHaveBeenCalled();
      expect(deploymentsService.create).toHaveBeenCalled();
      expect(notificationsService.notifyServiceEvent).toHaveBeenCalledWith(
        mockWorkspace.id,
        [mockUser.id],
        'CREATED',
        expect.objectContaining({ id: mockService.id }),
        expect.objectContaining({ id: mockProject.id }),
      );
    });

    it('should throw ConflictException if service name already exists', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(mockService);

      await expect(
        service.create(mockUser.id, mockProject.id, createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, 'nonexistent-project', createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not a workspace member', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockProject.id, createDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for DEPLOYER role', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: 'DEPLOYER',
      });

      await expect(
        service.create(mockUser.id, mockProject.id, createDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should auto-detect port for Docker images', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.service.create as jest.Mock).mockResolvedValue(mockService);
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);
      (dockerInspector.getExposedPort as jest.Mock).mockResolvedValue(3000);

      await service.create(mockUser.id, mockProject.id, {
        ...createDto,
        defaultPort: undefined,
      });

      expect(prisma.service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            defaultPort: 3000,
          }),
        }),
      );
    });

    it('should use default port 8080 when no port is detected', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.service.create as jest.Mock).mockResolvedValue(mockService);
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);
      (dockerInspector.getExposedPort as jest.Mock).mockResolvedValue(null);

      await service.create(mockUser.id, mockProject.id, {
        ...createDto,
        defaultPort: undefined,
      });

      expect(prisma.service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            defaultPort: 8080,
          }),
        }),
      );
    });

    it('should create system environment variables', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.service.create as jest.Mock).mockResolvedValue(mockService);
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);

      await service.create(mockUser.id, mockProject.id, createDto);

      expect(encryptionService.encrypt).toHaveBeenCalled();
      expect(prisma.environmentVariable.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all services for a project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockService]);
      (prisma.volume.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll(mockUser.id, mockProject.id);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockService.id);
    });

    it('should throw ForbiddenException when user is not a workspace member', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findAll(mockUser.id, mockProject.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow DEPLOYER role to view services', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: 'DEPLOYER',
      });
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockService]);
      (prisma.volume.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll(mockUser.id, mockProject.id);

      expect(result).toHaveLength(1);
    });

    it('should attach volumes to services', async () => {
      const mockVolume = {
        id: 'volume-123',
        name: 'data',
        serviceId: mockService.id,
        size: '10Gi',
        mountPath: '/data',
        status: 'ACTIVE',
      };
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockService]);
      (prisma.volume.findMany as jest.Mock).mockResolvedValue([mockVolume]);

      const result = await service.findAll(mockUser.id, mockProject.id);

      expect((result[0] as any).volumes).toHaveLength(1);
      expect((result[0] as any).volumes[0].id).toBe(mockVolume.id);
    });
  });

  describe('findOne', () => {
    it('should return a service by id', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const result = await service.findOne(
        mockUser.id,
        mockProject.id,
        mockService.id,
      );

      expect(result.id).toBe(mockService.id);
    });

    it('should throw NotFoundException when service does not exist', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOne(mockUser.id, mockProject.id, 'nonexistent-service'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when service is in different project', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue({
        ...mockService,
        projectId: 'different-project',
      });

      await expect(
        service.findOne(mockUser.id, mockProject.id, mockService.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'UpdatedService',
    };

    it('should update a service', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.service.update as jest.Mock).mockResolvedValue({
        ...mockService,
        name: 'UpdatedService',
      });
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.update(
        mockUser.id,
        mockProject.id,
        mockService.id,
        updateDto,
      );

      expect(result.name).toBe('UpdatedService');
      expect(notificationsService.notifyServiceEvent).toHaveBeenCalledWith(
        mockWorkspace.id,
        [mockUser.id],
        'UPDATED',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should throw ConflictException when subdomain is already taken', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.service.findFirst as jest.Mock).mockResolvedValue({
        id: 'other-service',
        subdomain: 'taken-subdomain',
      });

      await expect(
        service.update(mockUser.id, mockProject.id, mockService.id, {
          subdomain: 'taken-subdomain',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should trigger redeployment when start command changes', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue({
        ...mockService,
        defaultStartCommand: 'npm start',
      });
      (prisma.service.update as jest.Mock).mockResolvedValue({
        ...mockService,
        defaultStartCommand: 'npm run prod',
      });
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);

      await service.update(mockUser.id, mockProject.id, mockService.id, {
        defaultStartCommand: 'npm run prod',
      });

      expect(deploymentsService.create).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a service', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.service.delete as jest.Mock).mockResolvedValue(mockService);

      await service.remove(mockUser.id, mockProject.id, mockService.id);

      expect(prisma.service.delete).toHaveBeenCalledWith({
        where: { id: mockService.id },
      });
      expect(notificationsService.notifyServiceEvent).toHaveBeenCalledWith(
        mockWorkspace.id,
        [mockUser.id],
        'DELETED',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when service does not exist', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.remove(mockUser.id, mockProject.id, 'nonexistent-service'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMany', () => {
    it('should delete multiple services', async () => {
      const serviceIds = ['service-1', 'service-2'];
      const services = serviceIds.map((id) => ({ id, name: `Service ${id}` }));

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.service.findMany as jest.Mock).mockResolvedValue(services);
      (prisma.service.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await service.removeMany(
        mockUser.id,
        mockProject.id,
        serviceIds,
      );

      expect(result.deleted).toBe(2);
      expect(prisma.service.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: serviceIds },
          projectId: mockProject.id,
        },
      });
    });

    it('should throw NotFoundException when some services do not exist', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        { id: 'service-1', name: 'Service 1' },
      ]);

      await expect(
        service.removeMany(mockUser.id, mockProject.id, [
          'service-1',
          'nonexistent',
        ]),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle notification failure gracefully', async () => {
      const serviceIds = ['service-1'];
      const services = serviceIds.map((id) => ({ id, name: `Service ${id}` }));

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.service.findMany as jest.Mock).mockResolvedValue(services);
      (prisma.service.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (notificationsService.notifyServiceEvent as jest.Mock).mockRejectedValue(new Error('Notification failed'));

      const result = await service.removeMany(
        mockUser.id,
        mockProject.id,
        serviceIds,
      );

      expect(result.deleted).toBe(1);
    });
  });

  describe('GitHub service creation', () => {
    const githubDto = {
      name: 'GithubService',
      serviceType: ServiceType.GITHUB,
      githubInstallationId: 'installation-123',
      githubRepoFullName: 'owner/repo',
    };

    it('should create GitHub service and trigger auto-deploy', async () => {
      const gitHubAppService = {
        getLatestCommit: jest.fn().mockResolvedValue({
          sha: 'abc123',
          message: 'Initial commit',
          author: 'Developer',
        }),
      };
      const githubService = {
        ...mockService,
        serviceType: 'GITHUB',
        repositoryBranch: 'main',
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.service.create as jest.Mock).mockResolvedValue(githubService);
      (prisma.gitHubInstallation.findUnique as jest.Mock).mockResolvedValue({
        id: 'installation-123',
        installationId: 12345,
      });
      (prisma.deployment.create as jest.Mock).mockResolvedValue({ id: 'deploy-123' });
      (prisma.buildQueue.create as jest.Mock).mockResolvedValue({ id: 'build-123' });
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);

      // Need to mock the GitHubAppService on the module level
      const testModule = await Test.createTestingModule({
        providers: [
          ServicesService,
          { provide: PrismaService, useValue: prisma },
          { provide: getQueueToken('build'), useValue: buildQueue },
          { provide: getQueueToken('deploy'), useValue: { add: jest.fn() } },
          { provide: DeploymentsService, useValue: deploymentsService },
          { provide: NotificationsService, useValue: notificationsService },
          { provide: EncryptionService, useValue: encryptionService },
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost') } },
          { provide: DockerInspectorService, useValue: dockerInspector },
          { provide: GitHubAppService, useValue: gitHubAppService },
        ],
      }).compile();

      const svc = testModule.get<ServicesService>(ServicesService);
      const result = await svc.create(mockUser.id, mockProject.id, githubDto);

      expect(result).toBeDefined();
    });
  });

  describe('subdomain generation', () => {
    const createDto = {
      name: 'API Service',
      serviceType: ServiceType.DOCKER_IMAGE,
      dockerImage: 'nginx',
      subdomain: undefined,
    };

    it('should generate unique subdomain when not provided', async () => {
      const projectWithSlug = { ...mockProject, slug: 'my-project' };
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(projectWithSlug);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.service.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // check for existing service with same name
        .mockResolvedValueOnce(null); // check for existing subdomain
      (prisma.service.create as jest.Mock).mockResolvedValue({
        ...mockService,
        subdomain: 'api-service-my-project',
      });
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.create(mockUser.id, mockProject.id, createDto);

      expect(prisma.service.create).toHaveBeenCalled();
    });

    it('should handle subdomain collision with random suffix', async () => {
      const projectWithSlug = { ...mockProject, slug: 'my-project' };
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(projectWithSlug);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.service.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // check for existing service with same name
        .mockResolvedValueOnce({ id: 'other', subdomain: 'taken' }) // first subdomain taken
        .mockResolvedValueOnce(null); // second attempt free
      (prisma.service.create as jest.Mock).mockResolvedValue(mockService);
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);

      await service.create(mockUser.id, mockProject.id, createDto);

      expect(prisma.service.create).toHaveBeenCalled();
    });
  });

  describe('system environment variables', () => {
    const createDto = {
      name: 'TestService',
      serviceType: ServiceType.DOCKER_IMAGE,
      dockerImage: 'nginx',
    };

    it('should update existing system env var instead of creating new', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.service.create as jest.Mock).mockResolvedValue(mockService);
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-var',
        key: 'KUBIDU_SERVICE_ID',
      });
      (prisma.environmentVariable.update as jest.Mock).mockResolvedValue({});

      await service.create(mockUser.id, mockProject.id, createDto);

      expect(prisma.environmentVariable.update).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle deployment failure gracefully during create', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.service.create as jest.Mock).mockResolvedValue(mockService);
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);
      (deploymentsService.create as jest.Mock).mockRejectedValue(new Error('Deploy failed'));

      // Should not throw - just log the error
      const result = await service.create(mockUser.id, mockProject.id, {
        name: 'TestService',
        serviceType: ServiceType.DOCKER_IMAGE,
        dockerImage: 'nginx',
      });

      expect(result).toBeDefined();
    });

    it('should handle notification failure gracefully during create', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.service.create as jest.Mock).mockResolvedValue(mockService);
      (prisma.environmentVariable.findFirst as jest.Mock).mockResolvedValue(null);
      (notificationsService.notifyServiceEvent as jest.Mock).mockRejectedValue(new Error('Notify failed'));

      const result = await service.create(mockUser.id, mockProject.id, {
        name: 'TestService',
        serviceType: ServiceType.DOCKER_IMAGE,
        dockerImage: 'nginx',
      });

      expect(result).toBeDefined();
    });
  });
});
