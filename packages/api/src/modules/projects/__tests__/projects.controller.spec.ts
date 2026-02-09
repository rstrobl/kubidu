import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProjectsController } from '../projects.controller';
import { ProjectsService } from '../projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let projectsService: jest.Mocked<ProjectsService>;

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    slug: 'test-project',
    description: 'A test project',
    workspaceId: 'workspace-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockProjectsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: ProjectsService, useValue: mockProjectsService },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    projectsService = module.get(ProjectsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all projects for a workspace', async () => {
      projectsService.findAll.mockResolvedValue([mockProject] as any);

      const result = await controller.findAll(
        { user: { id: 'user-123' } },
        'workspace-123',
      );

      expect(result).toHaveLength(1);
      expect(projectsService.findAll).toHaveBeenCalledWith('user-123', 'workspace-123');
    });

    it('should throw BadRequestException when workspaceId is missing', async () => {
      await expect(
        controller.findAll({ user: { id: 'user-123' } }, undefined as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a project by id', async () => {
      projectsService.findOne.mockResolvedValue(mockProject as any);

      const result = await controller.findOne(
        { user: { id: 'user-123' } },
        'project-123',
      );

      expect(result).toEqual(mockProject);
      expect(projectsService.findOne).toHaveBeenCalledWith('user-123', 'project-123');
    });
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const createDto = { name: 'New Project', description: 'Test' };
      projectsService.create.mockResolvedValue(mockProject as any);

      const result = await controller.create(
        { user: { id: 'user-123' } },
        'workspace-123',
        createDto,
      );

      expect(result).toEqual(mockProject);
      expect(projectsService.create).toHaveBeenCalledWith('user-123', 'workspace-123', createDto);
    });

    it('should throw BadRequestException when workspaceId is missing', async () => {
      const createDto = { name: 'New Project' };

      await expect(
        controller.create({ user: { id: 'user-123' } }, undefined as any, createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      const updateDto = { name: 'Updated Project' };
      const updatedProject = { ...mockProject, name: 'Updated Project' };
      projectsService.update.mockResolvedValue(updatedProject as any);

      const result = await controller.update(
        { user: { id: 'user-123' } },
        'project-123',
        updateDto,
      );

      expect(result.name).toBe('Updated Project');
      expect(projectsService.update).toHaveBeenCalledWith('user-123', 'project-123', updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a project', async () => {
      projectsService.remove.mockResolvedValue(undefined);

      await controller.remove(
        { user: { id: 'user-123' } },
        'project-123',
      );

      expect(projectsService.remove).toHaveBeenCalledWith('user-123', 'project-123');
    });
  });
});
