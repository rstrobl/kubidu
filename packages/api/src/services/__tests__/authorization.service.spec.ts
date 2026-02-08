import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthorizationService } from '../authorization.service';
import { PrismaService } from '../../database/prisma.service';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let prisma: jest.Mocked<PrismaService>;

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
    name: 'Test Service',
    project: { workspaceId: mockWorkspace.id },
  };

  const mockMembership = {
    id: 'member-123',
    userId: mockUser.id,
    workspaceId: mockWorkspace.id,
    role: 'ADMIN' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      workspaceMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
      service: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkWorkspaceAccess', () => {
    it('should return membership for valid access', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const result = await service.checkWorkspaceAccess(
        mockUser.id,
        mockWorkspace.id,
        ['ADMIN'],
      );

      expect(result.membership).toEqual(mockMembership);
      expect(result.workspaceId).toBe(mockWorkspace.id);
    });

    it('should throw ForbiddenException for non-member', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.checkWorkspaceAccess(mockUser.id, mockWorkspace.id, ['ADMIN']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for insufficient role', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: 'MEMBER',
      });

      await expect(
        service.checkWorkspaceAccess(mockUser.id, mockWorkspace.id, ['ADMIN']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow access for any of the allowed roles', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: 'DEPLOYER',
      });

      const result = await service.checkWorkspaceAccess(
        mockUser.id,
        mockWorkspace.id,
        ['ADMIN', 'MEMBER', 'DEPLOYER'],
      );

      expect(result.membership.role).toBe('DEPLOYER');
    });
  });

  describe('checkWorkspaceAccessViaProject', () => {
    it('should return access info when project exists and user is member', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const result = await service.checkWorkspaceAccessViaProject(
        mockUser.id,
        mockProject.id,
        ['ADMIN'],
      );

      expect(result.workspaceId).toBe(mockWorkspace.id);
      expect(result.projectId).toBe(mockProject.id);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.checkWorkspaceAccessViaProject(mockUser.id, 'nonexistent', ['ADMIN']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not a workspace member', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.checkWorkspaceAccessViaProject(mockUser.id, mockProject.id, ['ADMIN']),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkWorkspaceAccessViaService', () => {
    it('should return access info when service exists and user is member', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const result = await service.checkWorkspaceAccessViaService(
        mockUser.id,
        mockService.id,
        ['ADMIN'],
      );

      expect(result.workspaceId).toBe(mockWorkspace.id);
      expect(result.serviceId).toBe(mockService.id);
    });

    it('should throw NotFoundException when service does not exist', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.checkWorkspaceAccessViaService(mockUser.id, 'nonexistent', ['ADMIN']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isWorkspaceMember', () => {
    it('should return true for member', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const result = await service.isWorkspaceMember(mockUser.id, mockWorkspace.id);

      expect(result).toBe(true);
    });

    it('should return false for non-member', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.isWorkspaceMember(mockUser.id, mockWorkspace.id);

      expect(result).toBe(false);
    });
  });

  describe('getUserRole', () => {
    it('should return role for member', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const result = await service.getUserRole(mockUser.id, mockWorkspace.id);

      expect(result).toBe('ADMIN');
    });

    it('should return null for non-member', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getUserRole(mockUser.id, mockWorkspace.id);

      expect(result).toBeNull();
    });
  });

  describe('getWorkspaceMemberIds', () => {
    it('should return all member IDs', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
        { userId: 'user-3' },
      ]);

      const result = await service.getWorkspaceMemberIds(mockWorkspace.id);

      expect(result).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('should return empty array for workspace with no members', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getWorkspaceMemberIds(mockWorkspace.id);

      expect(result).toEqual([]);
    });
  });

  describe('getWorkspaceIdFromProject', () => {
    it('should return workspace ID', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const result = await service.getWorkspaceIdFromProject(mockProject.id);

      expect(result).toBe(mockWorkspace.id);
    });

    it('should throw NotFoundException for nonexistent project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getWorkspaceIdFromProject('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWorkspaceIdFromService', () => {
    it('should return workspace ID', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);

      const result = await service.getWorkspaceIdFromService(mockService.id);

      expect(result).toBe(mockWorkspace.id);
    });

    it('should throw NotFoundException for nonexistent service', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getWorkspaceIdFromService('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
