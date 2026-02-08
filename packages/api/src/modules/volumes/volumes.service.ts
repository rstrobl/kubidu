import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Volume } from '@prisma/client';

@Injectable()
export class VolumesService {
  private readonly logger = new Logger(VolumesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all volumes for a project
   */
  async findAll(userId: string, projectId: string): Promise<Volume[]> {
    // Verify project belongs to user
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this project');
    }

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

    if (volume.project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this volume');
    }

    return volume;
  }
}
