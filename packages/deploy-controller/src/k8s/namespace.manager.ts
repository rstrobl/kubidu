import { Injectable, Logger } from '@nestjs/common';
import { KubernetesClient } from './client';
import { V1Namespace, V1ResourceQuota } from '@kubernetes/client-node';

@Injectable()
export class NamespaceManager {
  private readonly logger = new Logger(NamespaceManager.name);

  constructor(private k8sClient: KubernetesClient) {}

  /**
   * Create or ensure a namespace exists for a workspace
   */
  async ensureNamespace(workspaceId: string): Promise<string> {
    const namespaceName = this.getWorkspaceNamespace(workspaceId);

    try {
      // Check if namespace exists
      await this.k8sClient.coreApi.readNamespace(namespaceName);
      this.logger.log(`Namespace ${namespaceName} already exists`);
      return namespaceName;
    } catch (error) {
      if (error.response?.statusCode === 404) {
        // Create namespace
        await this.createNamespace(namespaceName, workspaceId);
        // Note: Resource quotas disabled - enforce limits at application/billing level instead
        // await this.createResourceQuota(namespaceName);
        this.logger.log(`Created namespace ${namespaceName} for workspace ${workspaceId}`);
        return namespaceName;
      }
      throw error;
    }
  }

  /**
   * Create a namespace with labels
   */
  private async createNamespace(name: string, workspaceId: string): Promise<void> {
    const namespace: V1Namespace = {
      metadata: {
        name,
        labels: {
          'kubidu.io/workspace-id': workspaceId,
          'kubidu.io/managed': 'true',
        },
      },
    };

    await this.k8sClient.coreApi.createNamespace(namespace);
  }

  /**
   * Create resource quota for namespace
   */
  private async createResourceQuota(namespaceName: string): Promise<void> {
    const quota: V1ResourceQuota = {
      metadata: {
        name: 'kubidu-quota',
        namespace: namespaceName,
      },
      spec: {
        hard: {
          'requests.cpu': '4',
          'requests.memory': '8Gi',
          'limits.cpu': '8',
          'limits.memory': '16Gi',
          pods: '20',
          services: '10',
          'persistentvolumeclaims': '5',
          'requests.storage': '50Gi',
        },
      },
    };

    await this.k8sClient.coreApi.createNamespacedResourceQuota(namespaceName, quota);
    this.logger.log(`Created resource quota for namespace ${namespaceName}`);
  }

  /**
   * Delete a namespace and all its resources
   */
  async deleteNamespace(workspaceId: string): Promise<void> {
    const namespaceName = this.getWorkspaceNamespace(workspaceId);

    try {
      await this.k8sClient.coreApi.deleteNamespace(namespaceName);
      this.logger.log(`Deleted namespace ${namespaceName}`);
    } catch (error) {
      if (error.response?.statusCode !== 404) {
        throw error;
      }
    }
  }

  /**
   * Get namespace name for a workspace
   */
  getWorkspaceNamespace(workspaceId: string): string {
    return `kubidu-${workspaceId.substring(0, 8)}`;
  }
}
