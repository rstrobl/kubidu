import { Injectable, Logger } from '@nestjs/common';
import { KubernetesClient } from './client';
import { V2HorizontalPodAutoscaler } from '@kubernetes/client-node';

export interface HPAConfig {
  deploymentName: string;
  serviceId: string;
  minReplicas: number;
  maxReplicas: number;
  targetCPUUtilization: number;
  targetMemoryUtilization?: number;
}

export interface HPAStatus {
  name: string;
  minReplicas: number;
  maxReplicas: number;
  currentReplicas: number;
  desiredReplicas: number;
  currentCPUUtilization?: number;
  currentMemoryUtilization?: number;
  conditions?: Array<{
    type: string;
    status: string;
    reason: string;
    message: string;
    lastTransitionTime: Date;
  }>;
}

@Injectable()
export class HPAManager {
  private readonly logger = new Logger(HPAManager.name);

  constructor(private k8sClient: KubernetesClient) {}

  /**
   * Create or update a Horizontal Pod Autoscaler
   */
  async createOrUpdateHPA(namespace: string, config: HPAConfig): Promise<void> {
    const hpaName = `hpa-${config.deploymentName}`;
    const hpa = this.buildHPAManifest(namespace, hpaName, config);

    try {
      await this.k8sClient.autoscalingApi.replaceNamespacedHorizontalPodAutoscaler(
        hpaName,
        namespace,
        hpa,
      );
      this.logger.log(`Updated HPA ${hpaName} in namespace ${namespace}`);
    } catch (error) {
      if (error.response?.statusCode === 404) {
        await this.k8sClient.autoscalingApi.createNamespacedHorizontalPodAutoscaler(
          namespace,
          hpa,
        );
        this.logger.log(`Created HPA ${hpaName} in namespace ${namespace}`);
      } else {
        this.logger.error(`Failed to create/update HPA ${hpaName}: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Delete an HPA
   */
  async deleteHPA(namespace: string, deploymentName: string): Promise<void> {
    const hpaName = `hpa-${deploymentName}`;

    try {
      await this.k8sClient.autoscalingApi.deleteNamespacedHorizontalPodAutoscaler(
        hpaName,
        namespace,
      );
      this.logger.log(`Deleted HPA ${hpaName} from namespace ${namespace}`);
    } catch (error) {
      if (error.response?.statusCode !== 404) {
        this.logger.error(`Failed to delete HPA ${hpaName}: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Get HPA status
   */
  async getHPAStatus(namespace: string, deploymentName: string): Promise<HPAStatus | null> {
    const hpaName = `hpa-${deploymentName}`;

    try {
      const response = await this.k8sClient.autoscalingApi.readNamespacedHorizontalPodAutoscaler(
        hpaName,
        namespace,
      );
      
      const hpa = response.body;
      const status = hpa.status;
      const spec = hpa.spec;

      // Extract current CPU utilization from metrics
      let currentCPUUtilization: number | undefined;
      let currentMemoryUtilization: number | undefined;

      if (status?.currentMetrics) {
        for (const metric of status.currentMetrics) {
          if (metric.type === 'Resource' && metric.resource) {
            if (metric.resource.name === 'cpu' && metric.resource.current?.averageUtilization) {
              currentCPUUtilization = metric.resource.current.averageUtilization;
            }
            if (metric.resource.name === 'memory' && metric.resource.current?.averageUtilization) {
              currentMemoryUtilization = metric.resource.current.averageUtilization;
            }
          }
        }
      }

      return {
        name: hpaName,
        minReplicas: spec?.minReplicas || 1,
        maxReplicas: spec?.maxReplicas || 10,
        currentReplicas: status?.currentReplicas || 0,
        desiredReplicas: status?.desiredReplicas || 0,
        currentCPUUtilization,
        currentMemoryUtilization,
        conditions: status?.conditions?.map(c => ({
          type: c.type || 'Unknown',
          status: c.status || 'Unknown',
          reason: c.reason || '',
          message: c.message || '',
          lastTransitionTime: c.lastTransitionTime ? new Date(c.lastTransitionTime) : new Date(),
        })),
      };
    } catch (error) {
      if (error.response?.statusCode === 404) {
        return null;
      }
      this.logger.error(`Failed to get HPA status for ${deploymentName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all HPAs in a namespace
   */
  async listHPAs(namespace: string): Promise<HPAStatus[]> {
    try {
      const response = await this.k8sClient.autoscalingApi.listNamespacedHorizontalPodAutoscaler(
        namespace,
      );

      return response.body.items.map(hpa => {
        const status = hpa.status;
        const spec = hpa.spec;

        let currentCPUUtilization: number | undefined;
        let currentMemoryUtilization: number | undefined;

        if (status?.currentMetrics) {
          for (const metric of status.currentMetrics) {
            if (metric.type === 'Resource' && metric.resource) {
              if (metric.resource.name === 'cpu' && metric.resource.current?.averageUtilization) {
                currentCPUUtilization = metric.resource.current.averageUtilization;
              }
              if (metric.resource.name === 'memory' && metric.resource.current?.averageUtilization) {
                currentMemoryUtilization = metric.resource.current.averageUtilization;
              }
            }
          }
        }

        return {
          name: hpa.metadata?.name || 'unknown',
          minReplicas: spec?.minReplicas || 1,
          maxReplicas: spec?.maxReplicas || 10,
          currentReplicas: status?.currentReplicas || 0,
          desiredReplicas: status?.desiredReplicas || 0,
          currentCPUUtilization,
          currentMemoryUtilization,
          conditions: status?.conditions?.map(c => ({
            type: c.type || 'Unknown',
            status: c.status || 'Unknown',
            reason: c.reason || '',
            message: c.message || '',
            lastTransitionTime: c.lastTransitionTime ? new Date(c.lastTransitionTime) : new Date(),
          })),
        };
      });
    } catch (error) {
      this.logger.error(`Failed to list HPAs in namespace ${namespace}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build HPA manifest
   */
  private buildHPAManifest(
    namespace: string,
    hpaName: string,
    config: HPAConfig,
  ): V2HorizontalPodAutoscaler {
    const metrics: any[] = [
      {
        type: 'Resource',
        resource: {
          name: 'cpu',
          target: {
            type: 'Utilization',
            averageUtilization: config.targetCPUUtilization,
          },
        },
      },
    ];

    // Add memory metric if specified
    if (config.targetMemoryUtilization) {
      metrics.push({
        type: 'Resource',
        resource: {
          name: 'memory',
          target: {
            type: 'Utilization',
            averageUtilization: config.targetMemoryUtilization,
          },
        },
      });
    }

    return {
      apiVersion: 'autoscaling/v2',
      kind: 'HorizontalPodAutoscaler',
      metadata: {
        name: hpaName,
        namespace,
        labels: {
          'kubidu.io/service-id': config.serviceId,
          'kubidu.io/managed': 'true',
        },
      },
      spec: {
        scaleTargetRef: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          name: config.deploymentName,
        },
        minReplicas: config.minReplicas,
        maxReplicas: config.maxReplicas,
        metrics,
        behavior: {
          scaleDown: {
            stabilizationWindowSeconds: 300, // 5 minutes stabilization before scale down
            policies: [
              {
                type: 'Percent',
                value: 50,
                periodSeconds: 60,
              },
            ],
          },
          scaleUp: {
            stabilizationWindowSeconds: 0, // Scale up immediately
            policies: [
              {
                type: 'Percent',
                value: 100,
                periodSeconds: 15,
              },
              {
                type: 'Pods',
                value: 4,
                periodSeconds: 15,
              },
            ],
            selectPolicy: 'Max',
          },
        },
      },
    };
  }
}
