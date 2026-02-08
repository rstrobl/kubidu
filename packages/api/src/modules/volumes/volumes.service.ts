import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Volume, WorkspaceRole } from '@prisma/client';

@Injectable()
export class VolumesService {
  private readonly logger = new Logger(VolumesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if user has access to a workspace with required roles
   */
  private async checkWorkspaceAccess(
    userId: string,
    workspaceId: string,
    allowedRoles: WorkspaceRole[],
  ): Promise<void> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
    });

    if (!member || !allowedRoles.includes(member.role)) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }
  }

  /**
   * Get all volumes for a project
   */
  async findAll(userId: string, projectId: string): Promise<Volume[]> {
    // Verify project belongs to workspace user has access to
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceAccess(userId, project.workspaceId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
      WorkspaceRole.DEPLOYER,
    ]);

    return this.prisma.volume.findMany({
      where: { projectId },
      include: {
        templateDeployment: {
          select: {
            id: true,
            template: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single volume with details
   */
  async findOne(
    userId: string,
    projectId: string,
    volumeId: string,
  ): Promise<Volume> {
    const volume = await this.prisma.volume.findUnique({
      where: { id: volumeId },
      include: {
        project: true,
        templateDeployment: {
          select: {
            id: true,
            template: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!volume) {
      throw new NotFoundException('Volume not found');
    }

    if (volume.projectId !== projectId) {
      throw new NotFoundException('Volume not found in this project');
    }

    await this.checkWorkspaceAccess(userId, volume.project.workspaceId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
      WorkspaceRole.DEPLOYER,
    ]);

    return volume;
  }
}
