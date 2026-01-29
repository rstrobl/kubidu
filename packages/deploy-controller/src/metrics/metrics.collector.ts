import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { MetricsClient } from '../k8s/metrics.client';
import { NamespaceManager } from '../k8s/namespace.manager';
import { getCurrentBillingPeriod } from '@kubidu/shared';

@Injectable()
export class MetricsCollector {
  private readonly logger = new Logger(MetricsCollector.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsClient: MetricsClient,
    private readonly namespaceManager: NamespaceManager,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async collectMetrics(): Promise<void> {
    try {
      // Find all RUNNING deployments with their service/project info
      const runningDeployments = await this.prisma.deployment.findMany({
        where: { status: 'RUNNING' },
        include: {
          service: {
            include: {
              project: true,
            },
          },
        },
      });

      if (runningDeployments.length === 0) {
        return;
      }

      // Group by userId to query metrics per namespace
      const byUser = new Map<string, typeof runningDeployments>();
      for (const d of runningDeployments) {
        const userId = d.service.project.userId;
        if (!byUser.has(userId)) {
          byUser.set(userId, []);
        }
        byUser.get(userId)!.push(d);
      }

      const billingPeriod = getCurrentBillingPeriod();
      const now = new Date();

      for (const [userId, deployments] of byUser) {
        const namespace = this.namespaceManager.getUserNamespace(userId);

        for (const deployment of deployments) {
          try {
            const metrics = await this.metricsClient.getDeploymentMetrics(
              namespace,
              deployment.name,
              deployment.id,
            );

            if (metrics.cpuUsageMillicores > 0 || metrics.memoryUsageBytes > 0) {
              await this.prisma.usageRecord.createMany({
                data: [
                  {
                    userId,
                    resourceType: 'cpu',
                    amount: metrics.cpuUsageMillicores,
                    unit: 'millicores',
                    recordedAt: now,
                    billingPeriod,
                    projectId: deployment.service.projectId,
                    deploymentId: deployment.id,
                  },
                  {
                    userId,
                    resourceType: 'memory',
                    amount: metrics.memoryUsageBytes,
                    unit: 'bytes',
                    recordedAt: now,
                    billingPeriod,
                    projectId: deployment.service.projectId,
                    deploymentId: deployment.id,
                  },
                ],
              });
            }
          } catch (error) {
            this.logger.warn(
              `Failed to collect metrics for deployment ${deployment.id}: ${error.message}`,
            );
          }
        }
      }

      this.logger.log(
        `Collected metrics for ${runningDeployments.length} deployments`,
      );
    } catch (error) {
      this.logger.warn(`Metrics collection failed: ${error.message}`);
    }
  }
}
