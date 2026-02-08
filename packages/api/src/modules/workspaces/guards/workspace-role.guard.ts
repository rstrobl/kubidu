import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { WORKSPACE_ROLES_KEY } from '../decorators/workspace-roles.decorator';

/**
 * Guard that checks if the authenticated user has the required role in the workspace.
 *
 * The workspace ID is extracted from:
 * 1. Route parameter: :workspaceId
 * 2. Request body: workspaceId
 * 3. Query parameter: workspaceId
 *
 * If no workspace ID is found, the guard will throw a ForbiddenException.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
 * @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.MEMBER)
 */
@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      WORKSPACE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are specified, allow access (just JWT auth is enough)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract workspace ID from various sources
    const workspaceId = this.extractWorkspaceId(request);

    if (!workspaceId) {
      throw new ForbiddenException('Workspace ID is required');
    }

    // Check if workspace exists
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check user's membership and role
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

    // Check if user's role is in the required roles
    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${requiredRoles.join(', ')}`,
      );
    }

    // Attach workspace and membership to request for use in controllers/services
    request.workspace = workspace;
    request.workspaceMembership = membership;

    return true;
  }

  private extractWorkspaceId(request: any): string | undefined {
    // Priority 1: Route parameter (e.g., /workspaces/:workspaceId)
    if (request.params?.workspaceId) {
      return request.params.workspaceId;
    }

    // Priority 2: Route parameter with 'id' when on workspace routes
    if (request.params?.id && request.route?.path?.includes('/workspaces')) {
      return request.params.id;
    }

    // Priority 3: Request body
    if (request.body?.workspaceId) {
      return request.body.workspaceId;
    }

    // Priority 4: Query parameter
    if (request.query?.workspaceId) {
      return request.query.workspaceId;
    }

    return undefined;
  }
}
