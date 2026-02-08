import { SetMetadata } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';

export const WORKSPACE_ROLES_KEY = 'workspaceRoles';

/**
 * Decorator to specify which workspace roles are allowed to access an endpoint.
 * Used in conjunction with WorkspaceRoleGuard.
 *
 * @example
 * // Only admins can access
 * @WorkspaceRoles(WorkspaceRole.ADMIN)
 *
 * @example
 * // Admins and Members can access
 * @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.MEMBER)
 */
export const WorkspaceRoles = (...roles: WorkspaceRole[]) =>
  SetMetadata(WORKSPACE_ROLES_KEY, roles);
