import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProjectsService } from '../projects.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { WorkspaceRole } from '@prisma/client';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: jest.Mocked<PrismaService>;
  let authorizationService: jest.Mocked<AuthorizationService>;

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    slug: 'test-project',
    description: 'A test project',
    workspaceId: 'workspace-123',
    status: 'ACTIVE',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      project: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockAuthorizationService = {
      checkWorkspaceAccess: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthorizationService, useValue: mockAuthorizationService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prisma = module.get(PrismaService);
    authorizationService = module.get(AuthorizationService);
  });

  describe('create', () => {
    it('should create a project', async () => {
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.project.create as jest.Mock).mockResolvedValue(mockProject);

      const result = await service.create('user-123', 'workspace-123', {
        name: 'Test Project',
        description: 'A test project',
      });

      expect(result.id).toBe(mockProject.id);
      expect(result.name).toBe(mockProject.name);
    });

    it('should throw ConflictException if project name exists', async () => {
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);

      await expect(
        service.create('user-123', 'workspace-123', { name: 'Test Project' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all projects for a workspace', async () => {
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([mockProject]);

      const result = await service.findAll('user-123', 'workspace-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockProject.id);
    });
  });

  describe('findOne', () => {
    it('should return a project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      const result = await service.findOne('user-123', 'project-123');

      expect(result.id).toBe(mockProject.id);
    });

    it('should throw NotFoundException when project not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('user-123', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.project.update as jest.Mock).mockResolvedValue({ ...mockProject, name: 'Updated Project' });

      const result = await service.update('user-123', 'project-123', { name: 'Updated Project' });

      expect(result.name).toBe('Updated Project');
    });

    it('should throw NotFoundException when project not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('user-123', 'nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (authorizationService.checkWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.project.update as jest.Mock).mockResolvedValue({ ...mockProject, deletedAt: new Date() });

      await service.remove('user-123', 'project-123');

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'project-123' },
        data: {
          deletedAt: expect.any(Date),
          status: 'DELETED',
        },
      });
    });

    it('should throw NotFoundException when project not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('user-123', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWorkspaceId', () => {
    it('should return workspace ID for a project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({ workspaceId: 'workspace-123' });

      const result = await service.getWorkspaceId('project-123');

      expect(result).toBe('workspace-123');
    });

    it('should throw NotFoundException when project not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getWorkspaceId('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
