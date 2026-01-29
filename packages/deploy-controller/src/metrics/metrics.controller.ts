import { Controller, Get, Param, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MetricsClient } from '../k8s/metrics.client';
import { parseK8sCpu, parseK8sMemory } from '@kubidu/shared';

@Controller('metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsClient: MetricsClient,
  ) {}

  @Get(':namespace/project/:projectId')
  async getProjectLiveMetrics(
    @Param('namespace') namespace: string,
    @Param('projectId') projectId: string,
  ) {
    // Find active deployments for this project
    const deployments = await this.prisma.deployment.findMany({
      where: {
        status: 'RUNNING',
        service: {
          projectId,
        },
      },
      include: {
        service: true,
      },
    });

    if (deployments.length === 0) {
      return {
        deployments: [],
        totalCpuUsageMillicores: 0,
        totalMemoryUsageBytes: 0,
      };
    }

    const results = [];
    let totalCpu = 0;
    let totalMemory = 0;

    for (const deployment of deployments) {
      try {
        const metrics = await this.metricsClient.getDeploymentMetrics(
          namespace,
          deployment.name,
          deployment.id,
        );

        const cpuLimit = deployment.cpuLimit || deployment.service.defaultCpuLimit;
        const memoryLimit = deployment.memoryLimit || deployment.service.defaultMemoryLimit;

        const entry = {
          deploymentId: deployment.id,
          serviceName: deployment.service.name,
          cpuUsageMillicores: metrics.cpuUsageMillicores,
          cpuLimitMillicores: parseK8sCpu(cpuLimit),
          memoryUsageBytes: metrics.memoryUsageBytes,
          memoryLimitBytes: parseK8sMemory(memoryLimit),
          podCount: metrics.podCount,
        };

        results.push(entry);
        totalCpu += metrics.cpuUsageMillicores;
        totalMemory += metrics.memoryUsageBytes;
      } catch (error) {
        this.logger.warn(
          `Failed to get metrics for deployment ${deployment.id}: ${error.message}`,
        );
      }
    }

    return {
      deployments: results,
      totalCpuUsageMillicores: totalCpu,
      totalMemoryUsageBytes: totalMemory,
    };
  }
}
