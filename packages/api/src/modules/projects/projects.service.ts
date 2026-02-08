import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project, WorkspaceRole } from '@prisma/client';
import { slugify } from '@kubidu/shared';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if user has required access to workspace.
   * Throws ForbiddenException if not.
   */
  private async checkWorkspaceAccess(
    userId: string,
    workspaceId: string,
    allowedRoles: WorkspaceRole[],
  ): Promise<void> {
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
  }

  async create(
    userId: string,
    workspaceId: string,
    createProjectDto: CreateProjectDto,
  ): Promise<Project> {
    // Check workspace access - ADMIN and MEMBER can create projects
    await this.checkWorkspaceAccess(userId, workspaceId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
    ]);

    const slug = slugify(createProjectDto.name);

    // Check if slug already exists in this workspace
    const existing = await this.prisma.project.findFirst({
      where: {
        workspaceId,
        slug,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`Project with name "${createProjectDto.name}" already exists`);
    }

    const project = await this.prisma.project.create({
      data: {
        workspaceId,
        name: createProjectDto.name,
        slug,
        description: createProjectDto.description || null,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Project created: ${project.id} in workspace: ${workspaceId} by user: ${userId}`);

    return project;
  }

  async findAll(userId: string, workspaceId: string): Promise<Project[]> {
    // Check workspace access - any member can view projects
    await this.checkWorkspaceAccess(userId, workspaceId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
      WorkspaceRole.DEPLOYER,
    ]);

    return this.prisma.project.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      include: {
        services: {
          select: {
            id: true,
            name: true,
            serviceType: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, projectId: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        services: {
          include: {
            deployments: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
            consumingReferences: {
              select: {
                id: true,
                sourceServiceId: true,
                key: true,
                alias: true,
              },
            },
            volumes: {
              select: {
                id: true,
                name: true,
                size: true,
                mountPath: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check workspace membership - any member can view projects
    await this.checkWorkspaceAccess(userId, project.workspaceId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
      WorkspaceRole.DEPLOYER,
    ]);

    return project;
  }

  async update(
    userId: string,
    projectId: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    const existingProject = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existingProject) {
      throw new NotFoundException('Project not found');
    }

    // Check workspace access - ADMIN and MEMBER can update projects
    await this.checkWorkspaceAccess(userId, existingProject.workspaceId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
    ]);

    const updates: any = {};

    if (updateProjectDto.name !== undefined) {
      updates.name = updateProjectDto.name;
      updates.slug = slugify(updateProjectDto.name);
    }

    if (updateProjectDto.description !== undefined) {
      updates.description = updateProjectDto.description;
    }

    if (updateProjectDto.status !== undefined) {
      updates.status = updateProjectDto.status;
    }

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: updates,
    });

    this.logger.log(`Project updated: ${project.id}`);

    return project;
  }

  async remove(userId: string, projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check workspace access - ADMIN and MEMBER can delete projects
    await this.checkWorkspaceAccess(userId, project.workspaceId, [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MEMBER,
    ]);

    // Soft delete
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        deletedAt: new Date(),
        status: 'DELETED',
      },
    });

    this.logger.log(`Project deleted: ${projectId}`);
  }

  /**
   * Get workspace ID for a project. Used by other services.
   */
  async getWorkspaceId(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project.workspaceId;
  }
}
