import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';
import {
  parseK8sCpu,
  parseK8sMemory,
  getCurrentBillingPeriod,
  PLAN_LIMITS,
  ProjectAllocationStats,
  ProjectLiveMetrics,
} from '@kubidu/shared';

@Injectable()
export class UsageStatsService {
  private readonly logger = new Logger(UsageStatsService.name);
  private readonly deployControllerUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.deployControllerUrl =
      this.configService.get<string>('deployController.url') ||
      'http://deploy-controller:3002';
  }

  async getAllocationStats(
    userId: string,
    projectId: string,
  ): Promise<ProjectAllocationStats> {
    // Verify project belongs to user
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Get services for this project
    const services = await this.prisma.service.findMany({
      where: { projectId, status: 'ACTIVE' },
      include: {
        deployments: true,
      },
    });

    const serviceCount = services.length;
    let totalDeploymentCount = 0;
    let activeDeploymentCount = 0;
    let allocatedCpuMillicores = 0;
    let allocatedMemoryBytes = 0;
    let uptimeSeconds = 0;
    const now = new Date();

    for (const service of services) {
      totalDeploymentCount += service.deployments.length;

      for (const deployment of service.deployments) {
        if (deployment.status === 'RUNNING') {
          activeDeploymentCount++;

          const cpuLimit = deployment.cpuLimit || service.defaultCpuLimit;
          const memoryLimit = deployment.memoryLimit || service.defaultMemoryLimit;
          const replicas = deployment.replicas || service.defaultReplicas;

          allocatedCpuMillicores += parseK8sCpu(cpuLimit) * replicas;
          allocatedMemoryBytes += parseK8sMemory(memoryLimit) * replicas;

          if (deployment.deployedAt) {
            uptimeSeconds += Math.floor(
              (now.getTime() - deployment.deployedAt.getTime()) / 1000,
            );
          }
        }
      }
    }

    // Get build minutes used this billing period
    const billingPeriod = getCurrentBillingPeriod();
    const serviceIds = services.map((s) => s.id);

    let buildMinutesUsed = 0;
    if (serviceIds.length > 0) {
      const buildResult = await this.prisma.buildQueue.aggregate({
        where: {
          serviceId: { in: serviceIds },
          status: 'completed',
          buildEndTime: {
            gte: new Date(`${billingPeriod}-01T00:00:00.000Z`),
          },
        },
        _sum: {
          buildDurationSeconds: true,
        },
      });

      buildMinutesUsed = Math.ceil(
        (buildResult._sum.buildDurationSeconds || 0) / 60,
      );
    }

    // Get user's subscription plan
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    const planName = subscription?.plan?.toLowerCase() || 'free';
    const limits = PLAN_LIMITS[planName as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;

    return {
      serviceCount,
      activeDeploymentCount,
      totalDeploymentCount,
      buildMinutesUsed,
      allocatedCpuMillicores,
      allocatedMemoryBytes,
      uptimeSeconds,
      plan: {
        name: planName.charAt(0).toUpperCase() + planName.slice(1),
        limits: {
          maxCpuCores: limits.maxCpuCores,
          maxMemoryGb: limits.maxMemoryGb,
          buildMinutesPerMonth: limits.buildMinutesPerMonth,
          maxDeployments: limits.maxDeployments,
        },
      },
    };
  }

  async getLiveMetrics(
    userId: string,
    projectId: string,
  ): Promise<ProjectLiveMetrics | null> {
    // Verify project belongs to user
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const namespace = `kubidu-${userId.substring(0, 8)}`;

    try {
      const url = `${this.deployControllerUrl}/metrics/${namespace}/project/${projectId}`;
      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: 5000 }),
      );
      return response.data;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch live metrics for project ${projectId}: ${error.message}`,
      );
      return null;
    }
  }
}
