import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { MetricsClient } from '../k8s/metrics.client';
import { NamespaceManager } from '../k8s/namespace.manager';
import { DeploymentManager } from '../k8s/deployment.manager';
import { getCurrentBillingPeriod } from '@kubidu/shared';

@Injectable()
export class MetricsCollector {
  private readonly logger = new Logger(MetricsCollector.name);
  private readonly failedChecks = new Map<string, number>(); // Track consecutive failures

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsClient: MetricsClient,
    private readonly namespaceManager: NamespaceManager,
    private readonly deploymentManager: DeploymentManager,
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

      // Group by workspaceId to query metrics per namespace
      const byWorkspace = new Map<string, typeof runningDeployments>();
      for (const d of runningDeployments) {
        const workspaceId = d.service.project.workspaceId;
        if (!byWorkspace.has(workspaceId)) {
          byWorkspace.set(workspaceId, []);
        }
        byWorkspace.get(workspaceId)!.push(d);
      }

      const billingPeriod = getCurrentBillingPeriod();
      const now = new Date();

      for (const [workspaceId, deployments] of byWorkspace) {
        const namespace = this.namespaceManager.getWorkspaceNamespace(workspaceId);

        for (const deployment of deployments) {
          try {
            // First check if the deployment actually exists in k8s
            const podStatus = await this.deploymentManager.getPodStatus(
              namespace,
              deployment.name,
            );

            // If no pods and no error, deployment doesn't exist
            if (podStatus.overallStatus === 'NO_PODS' || podStatus.overallStatus === 'ERROR') {
              const failCount = (this.failedChecks.get(deployment.id) || 0) + 1;
              this.failedChecks.set(deployment.id, failCount);

              // After 3 consecutive failures, mark as STOPPED
              if (failCount >= 3) {
                this.logger.warn(
                  `Deployment ${deployment.id} not found in k8s after ${failCount} checks, marking as STOPPED`,
                );
                await this.prisma.deployment.update({
                  where: { id: deployment.id },
                  data: { status: 'STOPPED' },
                });
                this.failedChecks.delete(deployment.id);
              }
              continue;
            }

            // Reset fail counter on success
            this.failedChecks.delete(deployment.id);

            // Check for crashed/failing pods
            if (podStatus.overallStatus === 'FAILING') {
              this.logger.warn(
                `Deployment ${deployment.id} has failing pods, marking as CRASHED`,
              );
              await this.prisma.deployment.update({
                where: { id: deployment.id },
                data: { status: 'CRASHED' },
              });
              continue;
            }

            // Collect metrics
            const metrics = await this.metricsClient.getDeploymentMetrics(
              namespace,
              deployment.name,
              deployment.id,
            );

            if (metrics.cpuUsageMillicores > 0 || metrics.memoryUsageBytes > 0) {
              await this.prisma.usageRecord.createMany({
                data: [
                  {
                    workspaceId,
                    resourceType: 'cpu',
                    amount: metrics.cpuUsageMillicores,
                    unit: 'millicores',
                    recordedAt: now,
                    billingPeriod,
                    projectId: deployment.service.projectId,
                    deploymentId: deployment.id,
                  },
                  {
                    workspaceId,
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
