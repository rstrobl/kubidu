import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { Workspace, WorkspaceMember, WorkspaceInvitation, WorkspaceRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { slugify } from '@kubidu/shared';
import { randomBytes } from 'crypto';

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new workspace. The creating user becomes an ADMIN.
   */
  async create(userId: string, dto: CreateWorkspaceDto): Promise<Workspace> {
    const slug = slugify(dto.name);

    // Check if slug already exists
    const existing = await this.prisma.workspace.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(`A workspace with this name already exists`);
    }

    // Create workspace and add user as admin in a transaction
    const workspace = await this.prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name: dto.name,
          slug,
          avatarUrl: dto.avatarUrl || null,
        },
      });

      // Add creator as ADMIN
      await tx.workspaceMember.create({
        data: {
          userId,
          workspaceId: ws.id,
          role: WorkspaceRole.ADMIN,
        },
      });

      return ws;
    });

    this.logger.log(`Workspace created: ${workspace.id} by user: ${userId}`);

    return workspace;
  }

  /**
   * List all workspaces the user is a member of.
   */
  async findAllForUser(userId: string): Promise<(Workspace & { role: WorkspaceRole })[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));
  }

  /**
   * Get a workspace by ID. User must be a member.
   */
  async findOne(userId: string, workspaceId: string): Promise<Workspace & { role: WorkspaceRole }> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      include: {
        workspace: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    return {
      ...membership.workspace,
      role: membership.role,
    };
  }

  /**
   * Update a workspace. Requires ADMIN role.
   */
  async update(
    userId: string,
    workspaceId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    await this.checkWorkspaceAccess(userId, workspaceId, [WorkspaceRole.ADMIN]);

    const updates: any = {};

    if (dto.name !== undefined) {
      updates.name = dto.name;
      const newSlug = slugify(dto.name);

      // Check if new slug would conflict
      const existing = await this.prisma.workspace.findFirst({
        where: {
          slug: newSlug,
          id: { not: workspaceId },
        },
      });

      if (existing) {
        throw new ConflictException('A workspace with this name already exists');
      }

      updates.slug = newSlug;
    }

    if (dto.avatarUrl !== undefined) {
      updates.avatarUrl = dto.avatarUrl;
    }

    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: updates,
    });

    this.logger.log(`Workspace updated: ${workspaceId}`);

    return workspace;
  }

  /**
   * Delete a workspace. Requires ADMIN role.
   * This will cascade delete all projects, services, etc.
   */
  async remove(userId: string, workspaceId: string): Promise<void> {
    await this.checkWorkspaceAccess(userId, workspaceId, [WorkspaceRole.ADMIN]);

    await this.prisma.workspace.delete({
      where: { id: workspaceId },
    });

    this.logger.log(`Workspace deleted: ${workspaceId}`);
  }

  // ===============================
  // Member Management
  // ===============================

  /**
   * List all members of a workspace.
   */
  async listMembers(
    userId: string,
    workspaceId: string,
  ): Promise<(WorkspaceMember & { user: { id: string; email: string; name: string | null; avatarUrl: string | null } })[]> {
    // Any member can view the member list
    await this.checkWorkspaceAccess(userId, workspaceId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
      WorkspaceRole.DEPLOYER,
    ]);

    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Update a member's role. Requires ADMIN role.
   */
  async updateMemberRole(
    userId: string,
    workspaceId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
  ): Promise<WorkspaceMember> {
    await this.checkWorkspaceAccess(userId, workspaceId, [WorkspaceRole.ADMIN]);

    const member = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.workspaceId !== workspaceId) {
      throw new NotFoundException('Member not found');
    }

    // Prevent last admin from losing admin role
    if (member.role === WorkspaceRole.ADMIN && dto.role !== WorkspaceRole.ADMIN) {
      const adminCount = await this.prisma.workspaceMember.count({
        where: { workspaceId, role: WorkspaceRole.ADMIN },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Cannot remove the last admin from the workspace');
      }
    }

    const updated = await this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role: dto.role },
    });

    this.logger.log(`Member role updated: ${memberId} to ${dto.role}`);

    // Notify the affected user about their role change
    const user = await this.prisma.user.findUnique({
      where: { id: member.userId },
      select: { email: true, name: true },
    });
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    if (user && workspace) {
      await this.notificationsService.notifyWorkspaceMemberEvent(
        workspaceId,
        'ROLE_CHANGED',
        { id: workspaceId, name: workspace.name },
        { email: user.email, name: user.name || undefined, role: dto.role },
        [member.userId],
      );
    }

    return updated;
  }

  /**
   * Remove a member from workspace. Requires ADMIN role.
   */
  async removeMember(
    userId: string,
    workspaceId: string,
    memberId: string,
  ): Promise<void> {
    await this.checkWorkspaceAccess(userId, workspaceId, [WorkspaceRole.ADMIN]);

    const member = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.workspaceId !== workspaceId) {
      throw new NotFoundException('Member not found');
    }

    // Prevent removing self as admin if last admin
    if (member.userId === userId && member.role === WorkspaceRole.ADMIN) {
      const adminCount = await this.prisma.workspaceMember.count({
        where: { workspaceId, role: WorkspaceRole.ADMIN },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Cannot remove yourself as the last admin');
      }
    }

    await this.prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    this.logger.log(`Member removed: ${memberId} from workspace: ${workspaceId}`);
  }

  /**
   * Leave a workspace. Cannot leave if you're the last admin.
   */
  async leaveWorkspace(userId: string, workspaceId: string): Promise<void> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    // Prevent leaving if last admin
    if (membership.role === WorkspaceRole.ADMIN) {
      const adminCount = await this.prisma.workspaceMember.count({
        where: { workspaceId, role: WorkspaceRole.ADMIN },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot leave workspace as the last admin. Transfer ownership or delete the workspace.',
        );
      }
    }

    await this.prisma.workspaceMember.delete({
      where: { id: membership.id },
    });

    this.logger.log(`User ${userId} left workspace: ${workspaceId}`);
  }

  // ===============================
  // Invitation Management
  // ===============================

  /**
   * Create an invitation to join the workspace. Requires ADMIN role.
   */
  async createInvitation(
    userId: string,
    workspaceId: string,
    dto: InviteMemberDto,
  ): Promise<WorkspaceInvitation> {
    await this.checkWorkspaceAccess(userId, workspaceId, [WorkspaceRole.ADMIN]);

    // Check if user is already a member
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      const existingMembership = await this.prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: existingUser.id,
            workspaceId,
          },
        },
      });

      if (existingMembership) {
        throw new ConflictException('This user is already a member of the workspace');
      }
    }

    // Check if there's already a pending invitation
    const existingInvitation = await this.prisma.workspaceInvitation.findUnique({
      where: {
        workspaceId_email: {
          workspaceId,
          email: dto.email,
        },
      },
    });

    if (existingInvitation && !existingInvitation.acceptedAt) {
      throw new ConflictException('An invitation has already been sent to this email');
    }

    // Generate token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email: dto.email,
        role: dto.role,
        token,
        invitedById: userId,
        expiresAt,
      },
    });

    this.logger.log(`Invitation created for ${dto.email} to workspace: ${workspaceId}`);

    // Notify workspace admins about the invitation
    const admins = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, role: WorkspaceRole.ADMIN },
      select: { userId: true },
    });
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    if (admins.length > 0 && workspace) {
      await this.notificationsService.notifyWorkspaceMemberEvent(
        workspaceId,
        'INVITED',
        { id: workspaceId, name: workspace.name },
        { email: dto.email, role: dto.role },
        admins.map((a) => a.userId),
      );
    }

    return invitation;
  }

  /**
   * List pending invitations for a workspace. Requires ADMIN role.
   */
  async listInvitations(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceInvitation[]> {
    await this.checkWorkspaceAccess(userId, workspaceId, [WorkspaceRole.ADMIN]);

    return this.prisma.workspaceInvitation.findMany({
      where: {
        workspaceId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel/delete an invitation. Requires ADMIN role.
   */
  async cancelInvitation(
    userId: string,
    workspaceId: string,
    invitationId: string,
  ): Promise<void> {
    await this.checkWorkspaceAccess(userId, workspaceId, [WorkspaceRole.ADMIN]);

    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.workspaceId !== workspaceId) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.workspaceInvitation.delete({
      where: { id: invitationId },
    });

    this.logger.log(`Invitation cancelled: ${invitationId}`);
  }

  /**
   * Get invitation details by token (public endpoint).
   */
  async getInvitationByToken(
    token: string,
  ): Promise<{ invitation: WorkspaceInvitation; workspace: Workspace }> {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { token },
      include: { workspace: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or has expired');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException('This invitation has already been accepted');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('This invitation has expired');
    }

    return {
      invitation,
      workspace: invitation.workspace,
    };
  }

  /**
   * Accept an invitation. The authenticated user joins the workspace.
   */
  async acceptInvitation(userId: string, token: string): Promise<WorkspaceMember> {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { token },
      include: { workspace: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException('This invitation has already been accepted');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('This invitation has expired');
    }

    // Check if user is already a member
    const existingMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: invitation.workspaceId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('You are already a member of this workspace');
    }

    // Accept invitation and add member in a transaction
    const member = await this.prisma.$transaction(async (tx) => {
      // Mark invitation as accepted
      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      // Add user as member
      return tx.workspaceMember.create({
        data: {
          userId,
          workspaceId: invitation.workspaceId,
          role: invitation.role,
        },
      });
    });

    this.logger.log(`Invitation accepted: ${invitation.id} by user: ${userId}`);

    // Notify workspace members about the new member
    const workspaceMembers = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: invitation.workspaceId, userId: { not: userId } },
      select: { userId: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (workspaceMembers.length > 0 && user) {
      await this.notificationsService.notifyWorkspaceMemberEvent(
        invitation.workspaceId,
        'JOINED',
        { id: invitation.workspaceId, name: invitation.workspace.name },
        { email: user.email, name: user.name || undefined },
        workspaceMembers.map((m) => m.userId),
      );
    }

    return member;
  }

  // ===============================
  // Helper Methods
  // ===============================

  /**
   * Check if user has required access to workspace.
   * Throws ForbiddenException if not.
   */
  async checkWorkspaceAccess(
    userId: string,
    workspaceId: string,
    allowedRoles: WorkspaceRole[],
  ): Promise<WorkspaceMember> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      );
    }

    return membership;
  }

  /**
   * Get user's role in a workspace, or null if not a member.
   */
  async getUserRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    return membership?.role ?? null;
  }

  // ===============================
  // Audit Logs
  // ===============================

  /**
   * Get audit logs for a workspace
   */
  async getAuditLogs(
    workspaceId: string,
    options: {
      limit?: number;
      offset?: number;
      action?: string;
      resource?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const { limit = 50, offset = 0, action, resource, userId, startDate, endDate } = options;

    // Get all project IDs in this workspace
    const projects = await this.prisma.project.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    const projectIds = projects.map(p => p.id);

    // Build the where clause
    const where: any = {
      OR: [
        { metadata: { path: ['workspaceId'], equals: workspaceId } },
        { metadata: { path: ['projectId'], string_contains: projectIds.length > 0 ? projectIds[0] : 'none' } },
      ],
    };

    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }

    if (resource) {
      where.resource = { equals: resource };
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return { logs };
  }

  // ===============================
  // Team Activity
  // ===============================

  /**
   * Get team activity grouped by user
   */
  async getTeamActivity(workspaceId: string, userId?: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { 
        workspaceId,
        ...(userId ? { userId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            lastLoginAt: true,
          },
        },
      },
    });

    // Get activity stats for each member
    const memberActivity = await Promise.all(
      members.map(async (member) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get deployment count
        const deployments = await this.prisma.deployment.count({
          where: {
            service: {
              project: {
                workspaceId,
              },
            },
            createdAt: { gte: thirtyDaysAgo },
          },
        });

        // Get audit log actions count
        const actions = await this.prisma.auditLog.count({
          where: {
            userId: member.userId,
            createdAt: { gte: thirtyDaysAgo },
          },
        });

        // Get recent activity
        const recentActivity = await this.prisma.auditLog.findMany({
          where: {
            userId: member.userId,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        return {
          member: {
            id: member.id,
            userId: member.userId,
            role: member.role,
            joinedAt: member.createdAt,
          },
          user: member.user,
          stats: {
            deploymentsLast30Days: deployments,
            actionsLast30Days: actions,
          },
          recentActivity,
        };
      }),
    );

    return { members: memberActivity };
  }
}
