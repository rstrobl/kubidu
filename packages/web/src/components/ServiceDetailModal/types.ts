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
}

export type TabType = 'overview' | 'settings' | 'env' | 'domains' | 'deployments';

export interface Deployment {
  id: string;
  name: string;
  status: string;
  imageUrl?: string;
  imageTag?: string;
  gitCommitSha?: string;
  gitCommitMessage?: string;
  isActive?: boolean;
  createdAt: string;
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
