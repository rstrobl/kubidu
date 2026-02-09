import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthorizationService } from '../../services/authorization.service';
import { Volume, WorkspaceRole, VolumeStatus } from '@prisma/client';
import { CreateVolumeDto, VolumeSize } from './dto/create-volume.dto';
import { UpdateVolumeDto } from './dto/update-volume.dto';
import { AttachVolumeDto } from './dto/attach-volume.dto';

// Size ordering for validation
const SIZE_ORDER: Record<VolumeSize, number> = {
  [VolumeSize.SMALL]: 1,
  [VolumeSize.MEDIUM]: 5,
  [VolumeSize.LARGE]: 10,
  [VolumeSize.XLARGE]: 20,
  [VolumeSize.XXLARGE]: 50,
};

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
        service: {
          select: {
            id: true,
            name: true,
          },
        },
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
        service: {
          select: {
            id: true,
            name: true,
          },
        },
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

  /**
   * Create a new volume
   */
  async create(
    userId: string,
    projectId: string,
    dto: CreateVolumeDto,
  ): Promise<Volume> {
    // Verify workspace access - ADMIN and MEMBER can create volumes
    await this.authorizationService.checkWorkspaceAccessViaProject(userId, projectId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
    ]);

    // Check if volume name already exists in this project
    const existing = await this.prisma.volume.findUnique({
      where: {
        projectId_name: {
          projectId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Volume with name "${dto.name}" already exists in this project`,
      );
    }

    const volume = await this.prisma.volume.create({
      data: {
        projectId,
        name: dto.name,
        size: dto.size,
        mountPath: dto.mountPath || '/data',
        status: VolumeStatus.PENDING,
      },
    });

    this.logger.log(`Volume created: ${volume.id} for project: ${projectId} by user: ${userId}`);

    return volume;
  }

  /**
   * Update a volume (rename, resize)
   */
  async update(
    userId: string,
    projectId: string,
    volumeId: string,
    dto: UpdateVolumeDto,
  ): Promise<Volume> {
    // Verify workspace access
    await this.authorizationService.checkWorkspaceAccessViaProject(userId, projectId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
    ]);

    const volume = await this.prisma.volume.findUnique({
      where: { id: volumeId },
    });

    if (!volume || volume.projectId !== projectId) {
      throw new NotFoundException('Volume not found');
    }

    // If renaming, check for uniqueness
    if (dto.name && dto.name !== volume.name) {
      const existing = await this.prisma.volume.findUnique({
        where: {
          projectId_name: {
            projectId,
            name: dto.name,
          },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Volume with name "${dto.name}" already exists in this project`,
        );
      }
    }

    // If resizing, only allow increasing size
    if (dto.size) {
      const currentSizeValue = SIZE_ORDER[volume.size as VolumeSize] || 0;
      const newSizeValue = SIZE_ORDER[dto.size];
      
      if (newSizeValue < currentSizeValue) {
        throw new BadRequestException(
          'Volume size can only be increased, not decreased',
        );
      }
    }

    const updatedVolume = await this.prisma.volume.update({
      where: { id: volumeId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.size && { size: dto.size }),
      },
    });

    this.logger.log(`Volume updated: ${volumeId} by user: ${userId}`);

    return updatedVolume;
  }

  /**
   * Delete a volume
   */
  async remove(
    userId: string,
    projectId: string,
    volumeId: string,
  ): Promise<void> {
    // Verify workspace access
    await this.authorizationService.checkWorkspaceAccessViaProject(userId, projectId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
    ]);

    const volume = await this.prisma.volume.findUnique({
      where: { id: volumeId },
    });

    if (!volume || volume.projectId !== projectId) {
      throw new NotFoundException('Volume not found');
    }

    // Prevent deleting attached volumes
    if (volume.serviceId) {
      throw new BadRequestException(
        'Cannot delete a volume that is attached to a service. Detach it first.',
      );
    }

    await this.prisma.volume.delete({
      where: { id: volumeId },
    });

    this.logger.log(`Volume deleted: ${volumeId} by user: ${userId}`);
  }

  /**
   * Attach a volume to a service
   */
  async attach(
    userId: string,
    projectId: string,
    volumeId: string,
    dto: AttachVolumeDto,
  ): Promise<Volume> {
    // Verify workspace access
    await this.authorizationService.checkWorkspaceAccessViaProject(userId, projectId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
    ]);

    const volume = await this.prisma.volume.findUnique({
      where: { id: volumeId },
    });

    if (!volume || volume.projectId !== projectId) {
      throw new NotFoundException('Volume not found');
    }

    // Check if volume is already attached
    if (volume.serviceId) {
      throw new ConflictException(
        'Volume is already attached to a service. Detach it first.',
      );
    }

    // Verify the service exists in the same project
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service || service.projectId !== projectId) {
      throw new NotFoundException('Service not found in this project');
    }

    // Check if service already has a volume at this mount path
    const existingMount = await this.prisma.volume.findFirst({
      where: {
        serviceId: dto.serviceId,
        mountPath: dto.mountPath,
      },
    });

    if (existingMount) {
      throw new ConflictException(
        `Service already has a volume mounted at ${dto.mountPath}`,
      );
    }

    const updatedVolume = await this.prisma.volume.update({
      where: { id: volumeId },
      data: {
        serviceId: dto.serviceId,
        mountPath: dto.mountPath,
        status: VolumeStatus.BOUND,
        boundAt: new Date(),
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Volume ${volumeId} attached to service ${dto.serviceId} at ${dto.mountPath} by user: ${userId}`,
    );

    return updatedVolume;
  }

  /**
   * Detach a volume from a service
   */
  async detach(
    userId: string,
    projectId: string,
    volumeId: string,
  ): Promise<Volume> {
    // Verify workspace access
    await this.authorizationService.checkWorkspaceAccessViaProject(userId, projectId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
    ]);

    const volume = await this.prisma.volume.findUnique({
      where: { id: volumeId },
    });

    if (!volume || volume.projectId !== projectId) {
      throw new NotFoundException('Volume not found');
    }

    if (!volume.serviceId) {
      throw new BadRequestException('Volume is not attached to any service');
    }

    const updatedVolume = await this.prisma.volume.update({
      where: { id: volumeId },
      data: {
        serviceId: null,
        status: VolumeStatus.RELEASED,
        boundAt: null,
      },
    });

    this.logger.log(`Volume ${volumeId} detached by user: ${userId}`);

    return updatedVolume;
  }
}
