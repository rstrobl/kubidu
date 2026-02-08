import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole, WorkspaceMember } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface WorkspaceAccessResult {
  membership: WorkspaceMember;
  workspaceId: string;
}

export interface ProjectAccessResult extends WorkspaceAccessResult {
  projectId: string;
}

export interface ServiceAccessResult extends ProjectAccessResult {
  serviceId: string;
}

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if user has required access to a workspace.
   * @throws ForbiddenException if user is not a member or lacks required role
   */
  async checkWorkspaceAccess(
    userId: string,
    workspaceId: string,
    allowedRoles: WorkspaceRole[],
  ): Promise<WorkspaceAccessResult> {
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

    return { membership, workspaceId };
  }

  /**
   * Check if user has required access to workspace via project.
   * Resolves projectId to workspaceId and checks membership.
   * @throws NotFoundException if project doesn't exist
   * @throws ForbiddenException if user is not a member or lacks required role
   */
  async checkWorkspaceAccessViaProject(
    userId: string,
    projectId: string,
    allowedRoles: WorkspaceRole[],
  ): Promise<ProjectAccessResult> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const { membership, workspaceId } = await this.checkWorkspaceAccess(
      userId,
      project.workspaceId,
      allowedRoles,
    );

    return { membership, workspaceId, projectId };
  }

  /**
   * Check if user has required access to workspace via service.
   * Resolves serviceId to projectId to workspaceId and checks membership.
   * @throws NotFoundException if service doesn't exist
   * @throws ForbiddenException if user is not a member or lacks required role
   */
  async checkWorkspaceAccessViaService(
    userId: string,
    serviceId: string,
    allowedRoles: WorkspaceRole[],
  ): Promise<ServiceAccessResult> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { project: { select: { workspaceId: true } } },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const { membership, workspaceId } = await this.checkWorkspaceAccess(
      userId,
      service.project.workspaceId,
      allowedRoles,
    );

    return { membership, workspaceId, projectId: service.projectId, serviceId };
  }

  /**
   * Check if user has any membership in workspace (viewer role or higher).
   */
  async isWorkspaceMember(userId: string, workspaceId: string): Promise<boolean> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    return !!membership;
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

  /**
   * Get all member user IDs for a workspace.
   */
  async getWorkspaceMemberIds(workspaceId: string): Promise<string[]> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true },
    });

    return members.map((m) => m.userId);
  }

  /**
   * Get workspace ID from a project ID.
   * @throws NotFoundException if project doesn't exist
   */
  async getWorkspaceIdFromProject(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project.workspaceId;
  }

  /**
   * Get workspace ID from a service ID.
   * @throws NotFoundException if service doesn't exist
   */
  async getWorkspaceIdFromService(serviceId: string): Promise<string> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { project: { select: { workspaceId: true } } },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service.project.workspaceId;
  }
}
