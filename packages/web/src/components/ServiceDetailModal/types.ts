export interface Service {
  id: string;
  name: string;
  serviceType: 'GITHUB' | 'DOCKER_IMAGE';
  status: string;
  repositoryUrl?: string;
  repositoryBranch?: string;
  dockerImage?: string;
  dockerTag?: string;
  defaultPort: number;
  defaultReplicas: number;
  defaultCpuLimit: string;
  defaultMemoryLimit: string;
  defaultCpuRequest: string;
  defaultMemoryRequest: string;
  defaultHealthCheckPath: string;
  defaultStartCommand?: string;
  subdomain?: string;
  url?: string;
  templateDeploymentId?: string;
  // Autoscaling configuration
  autoscalingEnabled?: boolean;
  autoscalingMinReplicas?: number;
  autoscalingMaxReplicas?: number;
  autoscalingTargetCPU?: number;
  autoscalingTargetMemory?: number;
}

export type TabType = 'overview' | 'settings' | 'env' | 'domains' | 'deployments' | 'autoscaling' | 'volumes';

export interface Deployment {
  id: string;
  name: string;
  status: string;
  imageUrl?: string | null;
  imageTag?: string | null;
  gitCommitSha?: string | null;
  gitCommitMessage?: string | null;
  gitAuthor?: string | null;
  isActive?: boolean;
  createdAt: string;
  deployedAt?: string | null;
  port?: number | null;
  replicas?: number | null;
  cpuLimit?: string | null;
  memoryLimit?: string | null;
  url?: string;
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value?: string;
  isSecret: boolean;
  isShared?: boolean;
  isSystem?: boolean;
  reference?: {
    sourceServiceName: string;
  };
}

export interface Domain {
  id: string;
  domain: string;
  isVerified: boolean;
  verificationCode: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface SharedVarSource {
  serviceId: string;
  serviceName: string;
  variables: EnvironmentVariable[];
}
