import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { DeployTemplateDto } from './dto/deploy-template.dto';
import { Template, TemplateDeployment } from '@prisma/client';
import {
  TemplateDefinition,
  TemplateEnvValue,
  TemplateDeploymentStatus,
} from '@kubidu/shared';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('template') private readonly templateQueue: Queue,
  ) {}

  async findAll(): Promise<Template[]> {
    return this.prisma.template.findMany({
      where: { isPublic: true },
      orderBy: [{ isOfficial: 'desc' }, { name: 'asc' }],
    });
  }

  async findByCategory(category: string): Promise<Template[]> {
    return this.prisma.template.findMany({
      where: { isPublic: true, category },
      orderBy: [{ isOfficial: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Template> {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async findBySlug(slug: string): Promise<Template> {
    const template = await this.prisma.template.findUnique({
      where: { slug },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async deploy(
    userId: string,
    projectId: string,
    dto: DeployTemplateDto,
  ): Promise<TemplateDeployment> {
    // Verify project exists and belongs to user
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this project');
    }

    // Get template
    const template = await this.prisma.template.findUnique({
      where: { id: dto.templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const definition = template.definition as unknown as TemplateDefinition;

    // Validate required inputs
    const requiredInputs = this.getRequiredInputs(definition);
    for (const input of requiredInputs) {
      if (!dto.inputs?.[input.key]) {
        throw new BadRequestException(`Missing required input: ${input.label}`);
      }
    }

    // Create template deployment record
    const templateDeployment = await this.prisma.templateDeployment.create({
      data: {
        templateId: template.id,
        projectId,
        status: 'PENDING',
      },
    });

    // Enqueue the deployment job
    await this.templateQueue.add(
      'deploy-template',
      {
        templateDeploymentId: templateDeployment.id,
        templateId: template.id,
        projectId,
        userId,
        inputs: dto.inputs || {},
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Template deployment enqueued: ${templateDeployment.id} for template ${template.name}`,
    );

    return templateDeployment;
  }

  async getDeployment(
    userId: string,
    projectId: string,
    deploymentId: string,
  ): Promise<TemplateDeployment & { template: Template; services: any[] }> {
    const deployment = await this.prisma.templateDeployment.findUnique({
      where: { id: deploymentId },
      include: {
        template: true,
        project: true,
        services: true,
      },
    });

    if (!deployment) {
      throw new NotFoundException('Template deployment not found');
    }

    if (deployment.projectId !== projectId) {
      throw new NotFoundException('Template deployment not found in this project');
    }

    if (deployment.project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this deployment');
    }

    return deployment;
  }

  async getProjectDeployments(
    userId: string,
    projectId: string,
  ): Promise<TemplateDeployment[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this project');
    }

    return this.prisma.templateDeployment.findMany({
      where: { projectId },
      include: { template: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private getRequiredInputs(
    definition: TemplateDefinition,
  ): Array<{ key: string; label: string }> {
    const inputs: Array<{ key: string; label: string }> = [];

    for (const service of definition.services) {
      if (service.env) {
        for (const [key, value] of Object.entries(service.env)) {
          // Input is required only if:
          // 1. It's explicitly marked as required, OR
          // 2. It has no default value and isn't explicitly optional
          if (this.isInputValue(value)) {
            const isRequired = value.input.required === true ||
              (value.input.required !== false && value.input.default === undefined);
            if (isRequired) {
              inputs.push({ key: `${service.name}.${key}`, label: value.input.label });
            }
          }
        }
      }
    }

    return inputs;
  }

  private isInputValue(
    value: TemplateEnvValue,
  ): value is { input: { label: string; default?: string; required?: boolean } } {
    return typeof value === 'object' && 'input' in value;
  }
}
