import { Injectable, Logger } from '@nestjs/common';
import { Metrics, PodMetric } from '@kubernetes/client-node';
import { KubernetesClient } from './client';

export interface PodMetricsResult {
  podName: string;
  cpuUsageMillicores: number;
  memoryUsageBytes: number;
}

export interface DeploymentMetricsResult {
  deploymentId: string;
  deploymentName: string;
  podCount: number;
  cpuUsageMillicores: number;
  memoryUsageBytes: number;
}

@Injectable()
export class MetricsClient {
  private readonly logger = new Logger(MetricsClient.name);
  private readonly metrics: Metrics;

  constructor(private readonly k8sClient: KubernetesClient) {
    this.metrics = new Metrics(this.k8sClient.config);
  }

  async getPodMetrics(namespace: string): Promise<PodMetricsResult[]> {
    const podMetricsList = await this.metrics.getPodMetrics(namespace);

    const results: PodMetricsResult[] = [];

    for (const podMetric of podMetricsList.items) {
      let cpuMillicores = 0;
      let memoryBytes = 0;

      for (const container of podMetric.containers) {
        cpuMillicores += this.parseCpuUsage(container.usage.cpu);
        memoryBytes += this.parseMemoryUsage(container.usage.memory);
      }

      results.push({
        podName: podMetric.metadata.name,
        cpuUsageMillicores: cpuMillicores,
        memoryUsageBytes: memoryBytes,
      });
    }

    return results;
  }

  async getDeploymentMetrics(
    namespace: string,
    deploymentName: string,
    deploymentId: string,
  ): Promise<DeploymentMetricsResult> {
    // Get pods for this deployment
    const podsResponse = await this.k8sClient.coreApi.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app=${deploymentName}`,
    );

    const podNames = new Set(
      podsResponse.body.items.map((p) => p.metadata?.name).filter(Boolean),
    );

    // Get all pod metrics in the namespace
    let allPodMetrics: PodMetric[];
    try {
      const podMetricsList = await this.metrics.getPodMetrics(namespace);
      allPodMetrics = podMetricsList.items;
    } catch {
      // metrics-server may not be available
      return {
        deploymentId,
        deploymentName,
        podCount: podNames.size,
        cpuUsageMillicores: 0,
        memoryUsageBytes: 0,
      };
    }

    let totalCpu = 0;
    let totalMemory = 0;
    let matchedPods = 0;

    for (const podMetric of allPodMetrics) {
      if (!podNames.has(podMetric.metadata.name)) continue;
      matchedPods++;

      for (const container of podMetric.containers) {
        totalCpu += this.parseCpuUsage(container.usage.cpu);
        totalMemory += this.parseMemoryUsage(container.usage.memory);
      }
    }

    return {
      deploymentId,
      deploymentName,
      podCount: matchedPods,
      cpuUsageMillicores: totalCpu,
      memoryUsageBytes: totalMemory,
    };
  }

  private parseCpuUsage(cpu: string): number {
    // K8s reports CPU in nanocores (e.g., '123456789n') or millicores ('123m') or cores ('1')
    if (cpu.endsWith('n')) {
      return Math.round(parseInt(cpu.slice(0, -1), 10) / 1_000_000);
    }
    if (cpu.endsWith('m')) {
      return parseInt(cpu.slice(0, -1), 10);
    }
    return Math.round(parseFloat(cpu) * 1000);
  }

  private parseMemoryUsage(memory: string): number {
    // K8s reports memory in Ki, Mi, Gi, or plain bytes
    if (memory.endsWith('Ki')) {
      return parseInt(memory.slice(0, -2), 10) * 1024;
    }
    if (memory.endsWith('Mi')) {
      return parseInt(memory.slice(0, -2), 10) * 1024 * 1024;
    }
    if (memory.endsWith('Gi')) {
      return parseInt(memory.slice(0, -2), 10) * 1024 * 1024 * 1024;
    }
    return parseInt(memory, 10);
  }
}
