import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRoleGuard } from '../workspace-role.guard';
import { PrismaService } from '../../../../database/prisma.service';
import { WorkspaceRole } from '@prisma/client';

describe('WorkspaceRoleGuard', () => {
  let guard: WorkspaceRoleGuard;
  let reflector: jest.Mocked<Reflector>;
  let prisma: jest.Mocked<PrismaService>;

  const mockWorkspace = {
    id: 'workspace-123',
    name: 'Test Workspace',
  };

  const mockMembership = {
    userId: 'user-123',
    workspaceId: 'workspace-123',
    role: WorkspaceRole.ADMIN,
  };

  const createMockContext = (overrides: any = {}): ExecutionContext => {
    const defaultRequest = {
      user: { id: 'user-123' },
      params: { workspaceId: 'workspace-123' },
      body: {},
      query: {},
      route: { path: '/workspaces/:workspaceId' },
      ...overrides,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => defaultRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockPrisma = {
      workspace: {
        findUnique: jest.fn(),
      },
      workspaceMember: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceRoleGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<WorkspaceRoleGuard>(WorkspaceRoleGuard);
    reflector = module.get(Reflector);
    prisma = module.get(PrismaService);
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(null);

      const result = await guard.canActivate(createMockContext());

      expect(result).toBe(true);
    });

    it('should allow access when user has required role', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([WorkspaceRole.ADMIN]);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspace);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const result = await guard.canActivate(createMockContext());

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([WorkspaceRole.ADMIN]);

      const context = createMockContext({ user: null });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when workspace ID is not provided', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([WorkspaceRole.ADMIN]);

      const context = createMockContext({
        params: {},
        body: {},
        query: {},
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when workspace does not exist', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([WorkspaceRole.ADMIN]);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(guard.canActivate(createMockContext())).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not a member', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([WorkspaceRole.ADMIN]);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspace);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(guard.canActivate(createMockContext())).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user role is insufficient', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([WorkspaceRole.ADMIN]);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspace);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: WorkspaceRole.VIEWER,
      });

      await expect(guard.canActivate(createMockContext())).rejects.toThrow(ForbiddenException);
    });

    it('should extract workspaceId from body', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([WorkspaceRole.ADMIN]);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspace);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const context = createMockContext({
        params: {},
        body: { workspaceId: 'workspace-123' },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should extract workspaceId from query', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([WorkspaceRole.ADMIN]);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspace);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const context = createMockContext({
        params: {},
        query: { workspaceId: 'workspace-123' },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should attach workspace and membership to request', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([WorkspaceRole.ADMIN]);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspace);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const mockRequest = {
        user: { id: 'user-123' },
        params: { workspaceId: 'workspace-123' },
        body: {},
        query: {},
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      await guard.canActivate(context);

      expect(mockRequest).toHaveProperty('workspace', mockWorkspace);
      expect(mockRequest).toHaveProperty('workspaceMembership', mockMembership);
    });
  });
});
