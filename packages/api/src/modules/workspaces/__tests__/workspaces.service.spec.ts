import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { WorkspacesService } from '../workspaces.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let prisma: jest.Mocked<PrismaService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockWorkspace = {
    id: 'workspace-123',
    name: 'Test Workspace',
    slug: 'test-workspace',
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMembership = {
    id: 'member-123',
    userId: mockUser.id,
    workspaceId: mockWorkspace.id,
    role: 'ADMIN' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInvitation = {
    id: 'invitation-123',
    workspaceId: mockWorkspace.id,
    email: 'invitee@example.com',
    role: 'MEMBER' as const,
    token: 'test-token',
    invitedById: mockUser.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    workspace: mockWorkspace,
  };

  beforeEach(async () => {
    const mockPrisma = {
      workspace: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      workspaceMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      workspaceInvitation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    const mockNotificationsService = {
      notifyWorkspaceMemberEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
    prisma = module.get(PrismaService);
    notificationsService = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a workspace and add creator as admin', async () => {
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.workspace.create as jest.Mock).mockResolvedValue(mockWorkspace);
      (prisma.workspaceMember.create as jest.Mock).mockResolvedValue(mockMembership);

      const result = await service.create(mockUser.id, { name: 'Test Workspace' });

      expect(result.id).toBe(mockWorkspace.id);
      expect(prisma.workspace.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Test Workspace',
            slug: 'test-workspace',
          }),
        }),
      );
    });

    it('should throw ConflictException if workspace name already exists', async () => {
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspace);

      await expect(
        service.create(mockUser.id, { name: 'Test Workspace' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllForUser', () => {
    it('should return all workspaces user is a member of', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { ...mockMembership, workspace: mockWorkspace },
      ]);

      const result = await service.findAllForUser(mockUser.id);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockWorkspace.id);
      expect(result[0].role).toBe('ADMIN');
    });

    it('should return empty array if user is not a member of any workspace', async () => {
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAllForUser(mockUser.id);

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a workspace with user role', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue({
        ...mockMembership,
        workspace: mockWorkspace,
      });

      const result = await service.findOne(mockUser.id, mockWorkspace.id);

      expect(result.id).toBe(mockWorkspace.id);
      expect(result.role).toBe('ADMIN');
    });

    it('should throw ForbiddenException if user is not a member', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOne(mockUser.id, mockWorkspace.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update workspace name and slug', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspace.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.workspace.update as jest.Mock).mockResolvedValue({
        ...mockWorkspace,
        name: 'New Name',
        slug: 'new-name',
      });

      const result = await service.update(mockUser.id, mockWorkspace.id, {
        name: 'New Name',
      });

      expect(result.name).toBe('New Name');
    });

    it('should throw ConflictException if new name conflicts', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspace.findFirst as jest.Mock).mockResolvedValue({
        id: 'other-workspace',
        slug: 'new-name',
      });

      await expect(
        service.update(mockUser.id, mockWorkspace.id, { name: 'New Name' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException for non-admin', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: 'MEMBER',
      });

      await expect(
        service.update(mockUser.id, mockWorkspace.id, { name: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete workspace for admin', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspace.delete as jest.Mock).mockResolvedValue(mockWorkspace);

      await service.remove(mockUser.id, mockWorkspace.id);

      expect(prisma.workspace.delete).toHaveBeenCalledWith({
        where: { id: mockWorkspace.id },
      });
    });

    it('should throw ForbiddenException for non-admin', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: 'MEMBER',
      });

      await expect(
        service.remove(mockUser.id, mockWorkspace.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listMembers', () => {
    it('should return all members of a workspace', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([
        { ...mockMembership, user: mockUser },
      ]);

      const result = await service.listMembers(mockUser.id, mockWorkspace.id);

      expect(result).toHaveLength(1);
      expect(result[0].user.email).toBe(mockUser.email);
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership) // checkWorkspaceAccess
        .mockResolvedValueOnce({ ...mockMembership, role: 'MEMBER' }); // find member
      (prisma.workspaceMember.update as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: 'DEPLOYER',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspace);

      const result = await service.updateMemberRole(
        mockUser.id,
        mockWorkspace.id,
        mockMembership.id,
        { role: 'DEPLOYER' as any },
      );

      expect(result.role).toBe('DEPLOYER');
    });

    it('should throw BadRequestException when trying to remove last admin role', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership) // checkWorkspaceAccess
        .mockResolvedValueOnce(mockMembership); // find member (is admin)
      (prisma.workspaceMember.count as jest.Mock).mockResolvedValue(1);

      await expect(
        service.updateMemberRole(
          mockUser.id,
          mockWorkspace.id,
          mockMembership.id,
          { role: 'MEMBER' as any },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when member not found', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(null);

      await expect(
        service.updateMemberRole(mockUser.id, mockWorkspace.id, 'nonexistent', {
          role: 'MEMBER' as any,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member', async () => {
      const memberToRemove = {
        ...mockMembership,
        id: 'member-456',
        userId: 'other-user',
        role: 'MEMBER' as const,
      };
      (prisma.workspaceMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(memberToRemove);
      (prisma.workspaceMember.delete as jest.Mock).mockResolvedValue(memberToRemove);

      await service.removeMember(mockUser.id, mockWorkspace.id, memberToRemove.id);

      expect(prisma.workspaceMember.delete).toHaveBeenCalledWith({
        where: { id: memberToRemove.id },
      });
    });

    it('should throw BadRequestException when removing self as last admin', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockMembership);
      (prisma.workspaceMember.count as jest.Mock).mockResolvedValue(1);

      await expect(
        service.removeMember(mockUser.id, mockWorkspace.id, mockMembership.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('leaveWorkspace', () => {
    it('should allow member to leave', async () => {
      const memberMembership = { ...mockMembership, role: 'MEMBER' as const };
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(memberMembership);
      (prisma.workspaceMember.delete as jest.Mock).mockResolvedValue(memberMembership);

      await service.leaveWorkspace(mockUser.id, mockWorkspace.id);

      expect(prisma.workspaceMember.delete).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not a member', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.leaveWorkspace(mockUser.id, mockWorkspace.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when leaving as last admin', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.workspaceMember.count as jest.Mock).mockResolvedValue(1);

      await expect(
        service.leaveWorkspace(mockUser.id, mockWorkspace.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createInvitation', () => {
    it('should create an invitation', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.workspaceInvitation.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.workspaceInvitation.create as jest.Mock).mockResolvedValue(mockInvitation);
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspace);

      const result = await service.createInvitation(
        mockUser.id,
        mockWorkspace.id,
        { email: 'invitee@example.com', role: 'MEMBER' as any },
      );

      expect(result.email).toBe('invitee@example.com');
      expect(notificationsService.notifyWorkspaceMemberEvent).toHaveBeenCalled();
    });

    it('should throw ConflictException if user is already a member', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce({ id: 'existing-member' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.createInvitation(mockUser.id, mockWorkspace.id, {
          email: 'existing@example.com',
          role: 'MEMBER' as any,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if invitation already exists', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.workspaceInvitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation);

      await expect(
        service.createInvitation(mockUser.id, mockWorkspace.id, {
          email: 'invitee@example.com',
          role: 'MEMBER' as any,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getInvitationByToken', () => {
    it('should return invitation details', async () => {
      (prisma.workspaceInvitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation);

      const result = await service.getInvitationByToken('test-token');

      expect(result.invitation.email).toBe(mockInvitation.email);
      expect(result.workspace.id).toBe(mockWorkspace.id);
    });

    it('should throw NotFoundException for invalid token', async () => {
      (prisma.workspaceInvitation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getInvitationByToken('invalid-token'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already accepted', async () => {
      (prisma.workspaceInvitation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        acceptedAt: new Date(),
      });

      await expect(
        service.getInvitationByToken('test-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if expired', async () => {
      (prisma.workspaceInvitation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.getInvitationByToken('test-token'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and add member', async () => {
      (prisma.workspaceInvitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.workspaceInvitation.update as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        acceptedAt: new Date(),
      });
      (prisma.workspaceMember.create as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: mockInvitation.role,
      });
      (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.acceptInvitation(mockUser.id, 'test-token');

      expect(result.role).toBe(mockInvitation.role);
      expect(notificationsService.notifyWorkspaceMemberEvent).toHaveBeenCalled();
    });

    it('should throw ConflictException if already a member', async () => {
      (prisma.workspaceInvitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation);
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      await expect(
        service.acceptInvitation(mockUser.id, 'test-token'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('checkWorkspaceAccess', () => {
    it('should return membership for valid access', async () => {
      (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const result = await service.checkWorkspaceAccess(mockUser.id, mockWorkspace.id, [
        'ADMIN',
      ]);

      expect(result.role).toBe('ADMIN');
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
  });

  describe('getUserRole', () => {
    it('should return user role', async () => {
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
});
