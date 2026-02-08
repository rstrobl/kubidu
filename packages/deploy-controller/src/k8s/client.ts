import {
  KubeConfig,
  CoreV1Api,
  AppsV1Api,
  NetworkingV1Api,
  AutoscalingV2Api,
} from '@kubernetes/client-node';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KubernetesClient {
  private readonly logger = new Logger(KubernetesClient.name);
  private kubeConfig: KubeConfig;
  public coreApi: CoreV1Api;
  public appsApi: AppsV1Api;
  public networkingApi: NetworkingV1Api;
  public autoscalingApi: AutoscalingV2Api;

  constructor(private configService: ConfigService) {
    this.kubeConfig = new KubeConfig();

    const inCluster = this.configService.get<boolean>('k8s.inCluster');
    const kubeconfigPath = this.configService.get<string>('k8s.kubeconfigPath');

    if (inCluster) {
      this.logger.log('Loading in-cluster Kubernetes configuration');
      this.kubeConfig.loadFromCluster();
    } else if (kubeconfigPath) {
      this.logger.log(`Loading Kubernetes configuration from ${kubeconfigPath}`);
      this.kubeConfig.loadFromFile(kubeconfigPath);
    } else {
      this.logger.log('Loading default Kubernetes configuration');
      this.kubeConfig.loadFromDefault();
    }

    // In Docker Compose, k3s writes kubeconfig with server 0.0.0.0:6443
    // but other containers need to reach it via the k3s service hostname
    for (const cluster of this.kubeConfig.clusters) {
      if (cluster.server.includes('0.0.0.0')) {
        (cluster as any).server = cluster.server.replace('0.0.0.0', 'k3s');
        this.logger.log(`Rewrote kubeconfig server to ${cluster.server}`);
      }
    }

    this.coreApi = this.kubeConfig.makeApiClient(CoreV1Api);
    this.appsApi = this.kubeConfig.makeApiClient(AppsV1Api);
    this.networkingApi = this.kubeConfig.makeApiClient(NetworkingV1Api);
    this.autoscalingApi = this.kubeConfig.makeApiClient(AutoscalingV2Api);

    this.logger.log('Kubernetes client initialized');
  }

  get config(): KubeConfig {
    return this.kubeConfig;
  }
}
