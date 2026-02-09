import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { WorkspacesController } from '../workspaces.controller';
import { WorkspacesService } from '../workspaces.service';
import { PrismaService } from '../../../database/prisma.service';
import { WorkspaceRole } from '@prisma/client';

describe('WorkspacesController', () => {
  let controller: WorkspacesController;
  let workspacesService: jest.Mocked<WorkspacesService>;

  const mockWorkspace = {
    id: 'workspace-123',
    name: 'Test Workspace',
    slug: 'test-workspace',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember = {
    id: 'member-123',
    userId: 'user-456',
    workspaceId: 'workspace-123',
    role: WorkspaceRole.MEMBER,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 'user-456', email: 'member@test.com', name: 'Member' },
  };

  beforeEach(async () => {
    const mockWorkspacesService = {
      findAllForUser: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      listMembers: jest.fn(),
      updateMemberRole: jest.fn(),
    };

    const mockPrisma = {
      workspace: { findUnique: jest.fn() },
      workspaceMember: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspacesController],
      providers: [
        { provide: WorkspacesService, useValue: mockWorkspacesService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    }).compile();

    controller = module.get<WorkspacesController>(WorkspacesController);
    workspacesService = module.get(WorkspacesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all workspaces for a user', async () => {
      workspacesService.findAllForUser.mockResolvedValue([mockWorkspace] as any);

      const result = await controller.findAll({ user: { id: 'user-123' } });

      expect(result).toHaveLength(1);
      expect(workspacesService.findAllForUser).toHaveBeenCalledWith('user-123');
    });
  });

  describe('findOne', () => {
    it('should return a workspace by id', async () => {
      workspacesService.findOne.mockResolvedValue(mockWorkspace as any);

      const result = await controller.findOne(
        { user: { id: 'user-123' } },
        'workspace-123',
      );

      expect(result).toEqual(mockWorkspace);
      expect(workspacesService.findOne).toHaveBeenCalledWith('user-123', 'workspace-123');
    });
  });

  describe('create', () => {
    it('should create a new workspace', async () => {
      const createDto = { name: 'New Workspace' };
      workspacesService.create.mockResolvedValue(mockWorkspace as any);

      const result = await controller.create(
        { user: { id: 'user-123' } },
        createDto as any,
      );

      expect(result).toEqual(mockWorkspace);
      expect(workspacesService.create).toHaveBeenCalledWith('user-123', createDto);
    });
  });

  describe('update', () => {
    it('should update a workspace', async () => {
      const updateDto = { name: 'Updated Workspace' };
      const updatedWorkspace = { ...mockWorkspace, name: 'Updated Workspace' };
      workspacesService.update.mockResolvedValue(updatedWorkspace as any);

      const result = await controller.update(
        { user: { id: 'user-123' } },
        'workspace-123',
        updateDto as any,
      );

      expect(result.name).toBe('Updated Workspace');
      expect(workspacesService.update).toHaveBeenCalledWith('user-123', 'workspace-123', updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a workspace', async () => {
      workspacesService.remove.mockResolvedValue(undefined);

      await controller.remove(
        { user: { id: 'user-123' } },
        'workspace-123',
      );

      expect(workspacesService.remove).toHaveBeenCalledWith('user-123', 'workspace-123');
    });
  });

  describe('listMembers', () => {
    it('should return workspace members', async () => {
      workspacesService.listMembers.mockResolvedValue([mockMember] as any);

      const result = await controller.listMembers(
        { user: { id: 'user-123' } },
        'workspace-123',
      );

      expect(result).toHaveLength(1);
      expect(workspacesService.listMembers).toHaveBeenCalledWith('user-123', 'workspace-123');
    });
  });

  describe('updateMemberRole', () => {
    it('should update a member role', async () => {
      const updateRoleDto = { role: WorkspaceRole.ADMIN };
      const updatedMember = { ...mockMember, role: WorkspaceRole.ADMIN };
      workspacesService.updateMemberRole.mockResolvedValue(updatedMember as any);

      const result = await controller.updateMemberRole(
        { user: { id: 'user-123' } },
        'workspace-123',
        'member-123',
        updateRoleDto,
      );

      expect(result.role).toBe(WorkspaceRole.ADMIN);
      expect(workspacesService.updateMemberRole).toHaveBeenCalledWith('user-123', 'workspace-123', 'member-123', updateRoleDto);
    });
  });
});
