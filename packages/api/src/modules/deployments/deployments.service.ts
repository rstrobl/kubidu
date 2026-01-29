import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { HttpService } from '@nestjs/axios';
import { Queue } from 'bull';
import { Deployment } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { UpdateDeploymentDto } from './dto/update-deployment.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DeploymentsService {
  private readonly logger = new Logger(DeploymentsService.name);
  private readonly deployControllerUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('deploy') private readonly deployQueue: Queue,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.deployControllerUrl = this.configService.get<string>('deployController.url') || 'http://deploy-controller:3002';
  }

  async create(
    userId: string,
    createDeploymentDto: CreateDeploymentDto,
  ): Promise<Deployment> {
    // Verify service exists and belongs to user's project
    const service = await this.prisma.service.findUnique({
      where: { id: createDeploymentDto.serviceId },
      include: { project: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to deploy this service');
    }

    const deployment = await this.prisma.deployment.create({
      data: {
        serviceId: createDeploymentDto.serviceId,
        name: `${service.name}-${Date.now()}`,
        status: 'PENDING',
        // Set imageUrl for Docker image services
        imageUrl: service.dockerImage || null,
        imageTag: service.dockerTag || 'latest',
        // Resource configuration can be overridden from DTO
        port: createDeploymentDto.port,
        replicas: createDeploymentDto.replicas,
        cpuLimit: createDeploymentDto.cpuLimit,
        memoryLimit: createDeploymentDto.memoryLimit,
        cpuRequest: createDeploymentDto.cpuRequest,
        memoryRequest: createDeploymentDto.memoryRequest,
        healthCheckPath: createDeploymentDto.healthCheckPath,
      },
    });

    this.logger.log(`Deployment created: ${deployment.id} for service: ${service.id}`);

    // Enqueue deployment job for deploy-controller to process (fire and forget)
    this.deployQueue.add({
      deploymentId: deployment.id,
      projectId: service.projectId,
      userId,
    }).then(() => {
      this.logger.log(`Deployment job enqueued for deployment: ${deployment.id}`);
    }).catch((error) => {
      this.logger.error(`Failed to enqueue deployment job: ${error.message}`);
    });

    return deployment;
  }

  async findAll(userId: string, serviceId?: string): Promise<any[]> {
    // Build where clause for user's deployments
    const where: any = {
      service: {
        project: {
          userId,
        },
      },
    };

    if (serviceId) {
      where.serviceId = serviceId;
    }

    const deployments = await this.prisma.deployment.findMany({
      where,
      include: {
        service: {
          include: {
            project: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with pod status for running deployments
    const enrichedDeployments = await Promise.all(
      deployments.map(async (deployment) => {
        if (deployment.status === 'RUNNING' || deployment.status === 'DEPLOYING') {
          try {
            const namespace = `kubidu-${userId.substring(0, 8)}`;
            const url = `${this.deployControllerUrl}/logs/${namespace}/${deployment.name}/status`;
            const response = await firstValueFrom(
              this.httpService.get(url, { timeout: 3000 })
            );
            return {
              ...deployment,
              podStatus: response.data,
            };
          } catch (error) {
            this.logger.debug(`Failed to get pod status for deployment ${deployment.id}: ${error.message}`);
            return deployment;
          }
        }
        return deployment;
      })
    );

    return enrichedDeployments;
  }

  async findOne(userId: string, deploymentId: string): Promise<any> {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        service: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!deployment) {
      throw new NotFoundException('Deployment not found');
    }

    if (deployment.service.project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this deployment');
    }

    return deployment;
  }

  async update(
    userId: string,
    deploymentId: string,
    updateDeploymentDto: UpdateDeploymentDto,
  ): Promise<Deployment> {
    await this.findOne(userId, deploymentId);

    const updates: any = {};

    if (updateDeploymentDto.status !== undefined) {
      updates.status = updateDeploymentDto.status;
    }

    if (updateDeploymentDto.imageTag !== undefined) {
      updates.imageTag = updateDeploymentDto.imageTag;
    }

    const deployment = await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: updates,
    });

    this.logger.log(`Deployment updated: ${deployment.id}`);

    return deployment;
  }

  async stop(userId: string, deploymentId: string): Promise<void> {
    await this.findOne(userId, deploymentId);

    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'STOPPED',
        stoppedAt: new Date(),
      },
    });

    this.logger.log(`Deployment stopped: ${deploymentId}`);
  }

  async restart(userId: string, deploymentId: string): Promise<void> {
    // Verify ownership and get deployment with service
    const deployment = await this.findOne(userId, deploymentId);

    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'PENDING',
      },
    });

    // Enqueue deployment job for deploy-controller to process (fire and forget)
    this.deployQueue.add({
      deploymentId: deployment.id,
      projectId: deployment.service.projectId,
      userId,
    }).then(() => {
      this.logger.log(`Deployment restarted and job enqueued: ${deploymentId}`);
    }).catch((error) => {
      this.logger.error(`Failed to enqueue restart job for deployment ${deploymentId}: ${error.message}`);
    });
  }

  async retry(userId: string, deploymentId: string): Promise<void> {
    // Verify ownership and get deployment with service
    const deployment = await this.findOne(userId, deploymentId);

    // Reset deployment status, clear error logs, and update with current service defaults
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'PENDING',
        deploymentLogs: null,
        stoppedAt: null,
        // Update with current service defaults
        port: deployment.service.defaultPort,
        replicas: deployment.service.defaultReplicas,
        cpuLimit: deployment.service.defaultCpuLimit,
        memoryLimit: deployment.service.defaultMemoryLimit,
        cpuRequest: deployment.service.defaultCpuRequest,
        memoryRequest: deployment.service.defaultMemoryRequest,
        healthCheckPath: deployment.service.defaultHealthCheckPath,
      },
    });

    this.logger.log(`Retrying deployment: ${deploymentId} with updated service defaults`);

    // Enqueue deployment job for deploy-controller to process
    this.deployQueue.add({
      deploymentId: deployment.id,
      projectId: deployment.service.projectId,
      userId,
    }).then(() => {
      this.logger.log(`Deployment retry job enqueued: ${deploymentId}`);
    }).catch((error) => {
      this.logger.error(`Failed to enqueue retry job for deployment ${deploymentId}: ${error.message}`);
    });
  }

  async getLogs(userId: string, deploymentId: string, tail?: number): Promise<string> {
    const deployment = await this.findOne(userId, deploymentId);

    // Generate namespace from userId (matching deploy-controller logic)
    const namespace = `kubidu-${userId.substring(0, 8)}`;

    try {
      // Call deploy-controller to get pod logs from Kubernetes
      const url = `${this.deployControllerUrl}/logs/${namespace}/${deployment.name}`;
      const params = tail ? { tail: tail.toString() } : {};

      const response = await firstValueFrom(
        this.httpService.get(url, { params, timeout: 5000 })
      );

      return response.data.logs;
    } catch (error) {
      this.logger.error(`Failed to get Kubernetes logs: ${error.message}`);

      // Fallback to stored logs if Kubernetes logs fail
      const logs = deployment.deploymentLogs || 'No logs available';

      if (tail) {
        const lines = logs.split('\n');
        return lines.slice(-tail).join('\n');
      }

      return logs;
    }
  }

  async getBuildLogs(userId: string, deploymentId: string, tail?: number): Promise<string> {
    const deployment = await this.findOne(userId, deploymentId);

    // Return build logs (from Docker build process)
    const logs = deployment.buildLogs || 'No build logs available yet';

    if (tail) {
      const lines = logs.split('\n');
      return lines.slice(-tail).join('\n');
    }

    return logs;
  }
}
