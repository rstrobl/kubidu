import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from '@prisma/client';
import { DeploymentsService } from '../deployments/deployments.service';
import { EncryptionService } from '../../services/encryption.service';
import { ConfigService } from '@nestjs/config';
import { DockerInspectorService } from './docker-inspector.service';
import { GitHubAppService } from '../github/github-app.service';
import { DeploymentStatus, BuildStatus } from '@kubidu/shared';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
    private readonly dockerInspector: DockerInspectorService,
    @Inject(forwardRef(() => DeploymentsService))
    private readonly deploymentsService: DeploymentsService,
    private readonly gitHubAppService: GitHubAppService,
    @InjectQueue('build') private readonly buildQueue: Queue,
  ) {}

  async create(
    userId: string,
    projectId: string,
    createServiceDto: CreateServiceDto,
  ): Promise<Service> {
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

    // Check if service name already exists in this project
    const existing = await this.prisma.service.findFirst({
      where: {
        projectId,
        name: createServiceDto.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Service with name "${createServiceDto.name}" already exists in this project`,
      );
    }

    // Auto-detect port from Docker image if not provided
    let defaultPort = createServiceDto.defaultPort || 8080;
    if (createServiceDto.serviceType === 'DOCKER_IMAGE' && createServiceDto.dockerImage && !createServiceDto.defaultPort) {
      const imageWithTag = createServiceDto.dockerTag
        ? `${createServiceDto.dockerImage}:${createServiceDto.dockerTag}`
        : createServiceDto.dockerImage;

      const detectedPort = await this.dockerInspector.getExposedPort(imageWithTag);
      if (detectedPort) {
        this.logger.log(`Auto-detected port ${detectedPort} for image ${imageWithTag}`);
        defaultPort = detectedPort;
      } else {
        this.logger.log(`No port detected for image ${imageWithTag}, using default ${defaultPort}`);
      }
    }

    const service = await this.prisma.service.create({
      data: {
        projectId,
        name: createServiceDto.name,
        serviceType: createServiceDto.serviceType as any,
        repositoryUrl: createServiceDto.repositoryUrl || null,
        repositoryProvider: createServiceDto.repositoryProvider || null,
        repositoryBranch: createServiceDto.repositoryBranch || null,
        githubInstallationId: createServiceDto.githubInstallationId || null,
        githubRepoFullName: createServiceDto.githubRepoFullName || null,
        dockerImage: createServiceDto.dockerImage || null,
        dockerTag: createServiceDto.dockerTag || null,
        defaultPort: defaultPort,
        defaultReplicas: createServiceDto.defaultReplicas || 1,
        defaultCpuLimit: createServiceDto.defaultCpuLimit || '1000m',
        defaultMemoryLimit: createServiceDto.defaultMemoryLimit || '512Mi',
        defaultCpuRequest: createServiceDto.defaultCpuRequest || '100m',
        defaultMemoryRequest: createServiceDto.defaultMemoryRequest || '128Mi',
        defaultHealthCheckPath: createServiceDto.defaultHealthCheckPath || '/',
        autoDeploy: createServiceDto.autoDeploy !== undefined ? createServiceDto.autoDeploy : true,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Service created: ${service.id} for project: ${projectId} by user: ${userId}`);

    // Create system environment variables
    await this.createSystemEnvironmentVariables(service.id, service.name, null, null);

    // Auto-deploy Docker image services
    if (createServiceDto.serviceType === 'DOCKER_IMAGE' && createServiceDto.dockerImage) {
      try {
        await this.deploymentsService.create(userId, {
          serviceId: service.id,
          port: service.defaultPort,
          replicas: service.defaultReplicas,
          cpuLimit: service.defaultCpuLimit,
          memoryLimit: service.defaultMemoryLimit,
          cpuRequest: service.defaultCpuRequest,
          memoryRequest: service.defaultMemoryRequest,
          healthCheckPath: service.defaultHealthCheckPath,
        });
        this.logger.log(`Auto-deployment created for Docker image service: ${service.id}`);
      } catch (error) {
        this.logger.error(`Failed to auto-deploy service ${service.id}:`, error);
      }
    }

    // Auto-deploy GitHub services (with App installation)
    if (
      createServiceDto.serviceType === 'GITHUB' &&
      createServiceDto.githubInstallationId &&
      createServiceDto.githubRepoFullName &&
      createServiceDto.repositoryUrl
    ) {
      try {
        await this.autoDeployGitHubService(service, createServiceDto);
      } catch (error) {
        this.logger.error(`Failed to auto-deploy GitHub service ${service.id}:`, error);
      }
    }

    return service;
  }

  async findAll(userId: string, projectId: string): Promise<Service[]> {
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

    // Get services with consuming references for canvas connections
    const services = await this.prisma.service.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        consumingReferences: {
          select: {
            key: true,
            sourceServiceId: true,
          },
        },
      },
    });

    // Get volumes for this project grouped by serviceId
    const volumes = await this.prisma.volume.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        serviceId: true,
        size: true,
        mountPath: true,
        status: true,
      },
    });

    // Attach volumes to services
    const volumesByService = new Map<string, typeof volumes>();
    for (const volume of volumes) {
      if (volume.serviceId) {
        const existing = volumesByService.get(volume.serviceId) || [];
        existing.push(volume);
        volumesByService.set(volume.serviceId, existing);
      }
    }

    return services.map((service) => ({
      ...service,
      volumes: volumesByService.get(service.id) || [],
    }));
  }

  async findOne(userId: string, projectId: string, serviceId: string): Promise<Service> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        project: true,
        deployments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.projectId !== projectId) {
      throw new NotFoundException('Service not found in this project');
    }

    if (service.project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this service');
    }

    return service;
  }

  async update(
    userId: string,
    projectId: string,
    serviceId: string,
    updateServiceDto: UpdateServiceDto,
  ): Promise<Service> {
    const service = await this.findOne(userId, projectId, serviceId);

    // If subdomain is being updated, check for uniqueness
    if (updateServiceDto.subdomain !== undefined) {
      const existingSubdomain = await this.prisma.service.findFirst({
        where: {
          subdomain: updateServiceDto.subdomain,
          id: { not: serviceId }, // Exclude current service
        },
      });

      if (existingSubdomain) {
        throw new ConflictException(
          `Subdomain "${updateServiceDto.subdomain}" is already taken`,
        );
      }
    }

    const updatedService = await this.prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(updateServiceDto.name !== undefined && { name: updateServiceDto.name }),
        ...(updateServiceDto.subdomain !== undefined && { subdomain: updateServiceDto.subdomain }),
        ...(updateServiceDto.repositoryBranch !== undefined && {
          repositoryBranch: updateServiceDto.repositoryBranch,
        }),
        ...(updateServiceDto.dockerTag !== undefined && { dockerTag: updateServiceDto.dockerTag }),
        ...(updateServiceDto.defaultPort !== undefined && { defaultPort: updateServiceDto.defaultPort }),
        ...(updateServiceDto.defaultReplicas !== undefined && { defaultReplicas: updateServiceDto.defaultReplicas }),
        ...(updateServiceDto.defaultCpuLimit !== undefined && { defaultCpuLimit: updateServiceDto.defaultCpuLimit }),
        ...(updateServiceDto.defaultMemoryLimit !== undefined && {
          defaultMemoryLimit: updateServiceDto.defaultMemoryLimit,
        }),
        ...(updateServiceDto.defaultCpuRequest !== undefined && { defaultCpuRequest: updateServiceDto.defaultCpuRequest }),
        ...(updateServiceDto.defaultMemoryRequest !== undefined && {
          defaultMemoryRequest: updateServiceDto.defaultMemoryRequest,
        }),
        ...(updateServiceDto.defaultHealthCheckPath !== undefined && {
          defaultHealthCheckPath: updateServiceDto.defaultHealthCheckPath,
        }),
        ...(updateServiceDto.defaultStartCommand !== undefined && {
          defaultStartCommand: updateServiceDto.defaultStartCommand,
        }),
        ...(updateServiceDto.autoDeploy !== undefined && { autoDeploy: updateServiceDto.autoDeploy }),
        ...(updateServiceDto.status !== undefined && { status: updateServiceDto.status as any }),
        ...(updateServiceDto.canvasX !== undefined && { canvasX: updateServiceDto.canvasX }),
        ...(updateServiceDto.canvasY !== undefined && { canvasY: updateServiceDto.canvasY }),
      },
    });

    this.logger.log(`Service updated: ${serviceId} by user: ${userId}`);

    // Update system environment variables if name changed
    if (updateServiceDto.name !== undefined) {
      await this.createSystemEnvironmentVariables(
        updatedService.id,
        updatedService.name,
        null,
        updatedService.url,
      );
    }

    // Trigger redeployment if start command or subdomain changed
    const startCommandChanged =
      updateServiceDto.defaultStartCommand !== undefined &&
      updateServiceDto.defaultStartCommand !== service.defaultStartCommand;
    const subdomainChanged =
      updateServiceDto.subdomain !== undefined &&
      updateServiceDto.subdomain !== service.subdomain;

    if (startCommandChanged || subdomainChanged) {
      try {
        await this.deploymentsService.create(userId, {
          serviceId: updatedService.id,
          port: updatedService.defaultPort,
          replicas: updatedService.defaultReplicas,
          cpuLimit: updatedService.defaultCpuLimit,
          memoryLimit: updatedService.defaultMemoryLimit,
          cpuRequest: updatedService.defaultCpuRequest,
          memoryRequest: updatedService.defaultMemoryRequest,
          healthCheckPath: updatedService.defaultHealthCheckPath,
        });
        this.logger.log(`Redeployment triggered for service ${serviceId} due to settings change`);
      } catch (error) {
        this.logger.error(`Failed to trigger redeployment for service ${serviceId}: ${error.message}`);
      }
    }

    return updatedService;
  }

  async remove(userId: string, projectId: string, serviceId: string): Promise<void> {
    const service = await this.findOne(userId, projectId, serviceId);

    await this.prisma.service.delete({
      where: { id: serviceId },
    });

    this.logger.log(`Service deleted: ${serviceId} by user: ${userId}`);
  }

  async removeMany(userId: string, projectId: string, serviceIds: string[]): Promise<{ deleted: number }> {
    // Validate project ownership once
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify all services belong to this project
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        projectId,
      },
      select: { id: true },
    });

    const foundIds = new Set(services.map((s) => s.id));
    const missingIds = serviceIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException(`Services not found: ${missingIds.join(', ')}`);
    }

    // Delete all services in a single transaction
    const result = await this.prisma.service.deleteMany({
      where: {
        id: { in: serviceIds },
        projectId,
      },
    });

    this.logger.log(`Deleted ${result.count} services from project ${projectId} by user ${userId}`);

    return { deleted: result.count };
  }

  private async autoDeployGitHubService(
    service: Service,
    dto: CreateServiceDto,
  ): Promise<void> {
    const installation = await this.prisma.gitHubInstallation.findUnique({
      where: { id: dto.githubInstallationId },
    });
    if (!installation) return;

    const [owner, repo] = dto.githubRepoFullName.split('/');
    const branch = service.repositoryBranch || 'main';

    const commit = await this.gitHubAppService.getLatestCommit(
      installation.installationId,
      owner,
      repo,
      branch,
    );

    const deployment = await this.prisma.deployment.create({
      data: {
        serviceId: service.id,
        name: `${service.name}-${Date.now()}`,
        status: DeploymentStatus.PENDING,
        gitCommitSha: commit.sha,
        gitCommitMessage: commit.message,
        gitAuthor: commit.author,
        port: service.defaultPort,
        replicas: service.defaultReplicas,
        cpuLimit: service.defaultCpuLimit,
        memoryLimit: service.defaultMemoryLimit,
        cpuRequest: service.defaultCpuRequest,
        memoryRequest: service.defaultMemoryRequest,
        healthCheckPath: service.defaultHealthCheckPath,
      },
    });

    const buildQueueEntry = await this.prisma.buildQueue.create({
      data: {
        serviceId: service.id,
        deploymentId: deployment.id,
        status: BuildStatus.QUEUED,
      },
    });

    await this.buildQueue.add(
      'build-image',
      {
        buildQueueId: buildQueueEntry.id,
        projectId: service.projectId,
        deploymentId: deployment.id,
        repositoryUrl: service.repositoryUrl,
        branch,
        commitSha: commit.sha,
        commitMessage: commit.message,
        author: commit.author,
        githubInstallationId: installation.installationId,
        githubRepoFullName: dto.githubRepoFullName,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Auto-deploy enqueued for GitHub service ${service.id}, deployment ${deployment.id}`,
    );
  }

  /**
   * Create or update system environment variables (KUBIDU_*)
   * These are auto-generated and cannot be edited by users
   */
  private async createSystemEnvironmentVariables(
    serviceId: string,
    serviceName: string,
    subdomain?: string | null,
    publicUrl?: string | null,
  ): Promise<void> {
    const systemVars = [
      { key: 'KUBIDU_SERVICE_ID', value: serviceId },
      { key: 'KUBIDU_SERVICE_NAME', value: serviceName },
      { key: 'KUBIDU_PRIVATE_DOMAIN', value: `${serviceName}.kubidu.internal` },
    ];

    // Add public domain if URL is available
    if (publicUrl) {
      try {
        const publicDomain = new URL(publicUrl).hostname;
        systemVars.push({ key: 'KUBIDU_PUBLIC_DOMAIN', value: publicDomain });
      } catch (error) {
        this.logger.warn(`Failed to parse public URL for service ${serviceId}: ${publicUrl}`);
      }
    }

    for (const { key, value } of systemVars) {
      const { encrypted, iv, authTag } = this.encryptionService.encrypt(value);

      // Check if variable already exists
      const existing = await this.prisma.environmentVariable.findFirst({
        where: {
          serviceId,
          deploymentId: null,
          key,
        },
      });

      if (existing) {
        // Update existing variable
        await this.prisma.environmentVariable.update({
          where: { id: existing.id },
          data: {
            valueEncrypted: encrypted,
            valueIv: `${iv}:${authTag}`,
          },
        });
      } else {
        // Create new variable
        await this.prisma.environmentVariable.create({
          data: {
            serviceId,
            deploymentId: null,
            key,
            valueEncrypted: encrypted,
            valueIv: `${iv}:${authTag}`,
            isSecret: false,
            isSystem: true,
          },
        });
      }
    }

    this.logger.log(`System environment variables created/updated for service ${serviceId}`);
  }
}
