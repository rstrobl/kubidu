import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bull';
import { TemplatesService } from '../templates.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { WorkspaceRole } from '@prisma/client';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let prisma: PrismaService;
  let authService: AuthorizationService;
  let templateQueue: any;

  const mockTemplate = {
    id: 'template-123',
    name: 'WordPress',
    slug: 'wordpress',
    description: 'Self-hosted WordPress blog',
    category: 'CMS',
    icon: 'wordpress',
    isPublic: true,
    isOfficial: true,
    definition: {
      services: [
        {
          name: 'wordpress',
          image: 'wordpress:latest',
          env: {
            WORDPRESS_DB_HOST: { value: 'mysql' },
            WORDPRESS_DB_USER: { input: { label: 'Database User', required: true } },
            WORDPRESS_DB_PASSWORD: { input: { label: 'Database Password', required: true } },
            WORDPRESS_DEBUG: { input: { label: 'Debug Mode', default: 'false', required: false } },
          },
        },
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTemplateDeployment = {
    id: 'deployment-123',
    templateId: 'template-123',
    projectId: 'project-123',
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    template: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    templateDeployment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockAuthService = {
    checkWorkspaceAccessViaProject: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthorizationService, useValue: mockAuthService },
        { provide: getQueueToken('template'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
    prisma = module.get(PrismaService);
    authService = module.get(AuthorizationService);
    templateQueue = module.get(getQueueToken('template'));
  });

  describe('findAll', () => {
    it('should return all public templates ordered by official first', async () => {
      const templates = [mockTemplate, { ...mockTemplate, id: 'template-456', isOfficial: false }];
      (prisma.template.findMany as jest.Mock).mockResolvedValue(templates);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(prisma.template.findMany).toHaveBeenCalledWith({
        where: { isPublic: true },
        orderBy: [{ isOfficial: 'desc' }, { name: 'asc' }],
      });
    });
  });

  describe('findByCategory', () => {
    it('should return templates filtered by category', async () => {
      (prisma.template.findMany as jest.Mock).mockResolvedValue([mockTemplate]);

      const result = await service.findByCategory('CMS');

      expect(result).toHaveLength(1);
      expect(prisma.template.findMany).toHaveBeenCalledWith({
        where: { isPublic: true, category: 'CMS' },
        orderBy: [{ isOfficial: 'desc' }, { name: 'asc' }],
      });
    });

    it('should return empty array for unknown category', async () => {
      (prisma.template.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findByCategory('Unknown');

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return template by ID', async () => {
      (prisma.template.findUnique as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await service.findOne('template-123');

      expect(result.id).toBe('template-123');
      expect(result.name).toBe('WordPress');
    });

    it('should throw NotFoundException for non-existent template', async () => {
      (prisma.template.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('should return template by slug', async () => {
      (prisma.template.findUnique as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await service.findBySlug('wordpress');

      expect(result.slug).toBe('wordpress');
      expect(prisma.template.findUnique).toHaveBeenCalledWith({
        where: { slug: 'wordpress' },
      });
    });

    it('should throw NotFoundException for non-existent slug', async () => {
      (prisma.template.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findBySlug('unknown-template')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deploy', () => {
    beforeEach(() => {
      (authService.checkWorkspaceAccessViaProject as jest.Mock).mockResolvedValue({
        workspaceId: 'workspace-123',
      });
      (prisma.template.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
      (prisma.templateDeployment.create as jest.Mock).mockResolvedValue(mockTemplateDeployment);
      (templateQueue.add as jest.Mock).mockResolvedValue({});
    });

    it('should create deployment and enqueue job with required inputs', async () => {
      const dto = {
        templateId: 'template-123',
        inputs: {
          'wordpress.WORDPRESS_DB_USER': 'admin',
          'wordpress.WORDPRESS_DB_PASSWORD': 'secret123',
        },
      };

      const result = await service.deploy('user-123', 'project-123', dto);

      expect(result.id).toBe('deployment-123');
      expect(prisma.templateDeployment.create).toHaveBeenCalledWith({
        data: {
          templateId: 'template-123',
          projectId: 'project-123',
          status: 'PENDING',
        },
      });
      expect(templateQueue.add).toHaveBeenCalledWith(
        'deploy-template',
        expect.objectContaining({
          templateDeploymentId: 'deployment-123',
          templateId: 'template-123',
          projectId: 'project-123',
          workspaceId: 'workspace-123',
          inputs: dto.inputs,
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }),
      );
    });

    it('should throw BadRequestException when required input is missing', async () => {
      const dto = {
        templateId: 'template-123',
        inputs: {
          'wordpress.WORDPRESS_DB_USER': 'admin',
          // Missing WORDPRESS_DB_PASSWORD
        },
      };

      await expect(
        service.deploy('user-123', 'project-123', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not require optional inputs with defaults', async () => {
      const dto = {
        templateId: 'template-123',
        inputs: {
          'wordpress.WORDPRESS_DB_USER': 'admin',
          'wordpress.WORDPRESS_DB_PASSWORD': 'secret123',
          // WORDPRESS_DEBUG is optional with default
        },
      };

      const result = await service.deploy('user-123', 'project-123', dto);

      expect(result.id).toBe('deployment-123');
    });

    it('should throw NotFoundException when template does not exist', async () => {
      (prisma.template.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deploy('user-123', 'project-123', {
          templateId: 'non-existent',
          inputs: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check workspace access before deploying', async () => {
      const dto = {
        templateId: 'template-123',
        inputs: {
          'wordpress.WORDPRESS_DB_USER': 'admin',
          'wordpress.WORDPRESS_DB_PASSWORD': 'secret123',
        },
      };

      await service.deploy('user-123', 'project-123', dto);

      expect(authService.checkWorkspaceAccessViaProject).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        [WorkspaceRole.ADMIN, WorkspaceRole.MEMBER, WorkspaceRole.DEPLOYER],
      );
    });
  });

  describe('getDeployment', () => {
    it('should return deployment with template and services', async () => {
      const deploymentWithRelations = {
        ...mockTemplateDeployment,
        template: mockTemplate,
        project: { id: 'project-123' },
        services: [],
      };
      (prisma.templateDeployment.findUnique as jest.Mock).mockResolvedValue(deploymentWithRelations);
      (authService.checkWorkspaceAccessViaProject as jest.Mock).mockResolvedValue({
        workspaceId: 'workspace-123',
      });

      const result = await service.getDeployment(
        'user-123',
        'project-123',
        'deployment-123',
      );

      expect(result.id).toBe('deployment-123');
      expect(result.template).toBeDefined();
    });

    it('should throw NotFoundException when deployment does not exist', async () => {
      (prisma.templateDeployment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getDeployment('user-123', 'project-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when deployment belongs to different project', async () => {
      const deploymentOtherProject = {
        ...mockTemplateDeployment,
        projectId: 'other-project',
        template: mockTemplate,
        project: { id: 'other-project' },
        services: [],
      };
      (prisma.templateDeployment.findUnique as jest.Mock).mockResolvedValue(deploymentOtherProject);

      await expect(
        service.getDeployment('user-123', 'project-123', 'deployment-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProjectDeployments', () => {
    it('should return all deployments for a project', async () => {
      (prisma.templateDeployment.findMany as jest.Mock).mockResolvedValue([
        { ...mockTemplateDeployment, template: mockTemplate },
      ]);
      (authService.checkWorkspaceAccessViaProject as jest.Mock).mockResolvedValue({
        workspaceId: 'workspace-123',
      });

      const result = await service.getProjectDeployments('user-123', 'project-123');

      expect(result).toHaveLength(1);
      expect(prisma.templateDeployment.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-123' },
        include: { template: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when project has no deployments', async () => {
      (prisma.templateDeployment.findMany as jest.Mock).mockResolvedValue([]);
      (authService.checkWorkspaceAccessViaProject as jest.Mock).mockResolvedValue({
        workspaceId: 'workspace-123',
      });

      const result = await service.getProjectDeployments('user-123', 'project-123');

      expect(result).toHaveLength(0);
    });
  });
});
