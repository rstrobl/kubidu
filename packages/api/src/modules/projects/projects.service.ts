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
import { Project } from '@prisma/client';
import { slugify } from '@kubidu/shared';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createProjectDto: CreateProjectDto): Promise<Project> {
    const slug = slugify(createProjectDto.name);

    // Check if slug already exists for this user
    const existing = await this.prisma.project.findFirst({
      where: {
        userId,
        slug,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`Project with name "${createProjectDto.name}" already exists`);
    }

    const project = await this.prisma.project.create({
      data: {
        userId,
        name: createProjectDto.name,
        slug,
        description: createProjectDto.description || null,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Project created: ${project.id} by user: ${userId}`);

    return project;
  }

  async findAll(userId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: {
        userId,
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
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this project');
    }

    return project;
  }

  async update(
    userId: string,
    projectId: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    await this.findOne(userId, projectId);

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
    await this.findOne(userId, projectId);

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
}
