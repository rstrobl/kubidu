import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthorizationService } from '../../services/authorization.service';
import { Volume, WorkspaceRole } from '@prisma/client';

@Injectable()
export class VolumesService {
  private readonly logger = new Logger(VolumesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  /**
   * Get all volumes for a project
   */
  async findAll(userId: string, projectId: string): Promise<Volume[]> {
    // Verify project belongs to workspace user has access to
    await this.authorizationService.checkWorkspaceAccessViaProject(userId, projectId, [
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

    await this.authorizationService.checkWorkspaceAccess(userId, volume.project.workspaceId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
      WorkspaceRole.DEPLOYER,
    ]);

    return volume;
  }
}
