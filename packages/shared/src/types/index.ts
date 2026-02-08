// Workspace types
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum WorkspaceRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  DEPLOYER = 'DEPLOYER',
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  invitedById: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

export interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  lastLoginAt: Date | null;
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

// API Key types
export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  permissions: ApiKeyPermission[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

export enum ApiKeyPermission {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
}

// Project types
export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

// Service types
export interface Service {
  id: string;
  projectId: string;
  name: string;
  serviceType: ServiceType;

  // GitHub source fields
  repositoryUrl: string | null;
  repositoryProvider: RepositoryProvider | null;
  repositoryBranch: string | null;
  githubInstallationId: string | null;
  githubRepoFullName: string | null;

  // Docker image source fields
  dockerImage: string | null;
  dockerTag: string | null;

  // Template-related fields
  templateDeploymentId: string | null;

  // Default service configuration
  defaultPort: number;
  defaultReplicas: number;
  defaultCpuLimit: string;
  defaultMemoryLimit: string;
  defaultCpuRequest: string;
  defaultMemoryRequest: string;
  defaultHealthCheckPath: string;

  autoDeploy: boolean;
  status: ServiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum ServiceType {
  GITHUB = 'GITHUB',
  DOCKER_IMAGE = 'DOCKER_IMAGE',
}

export enum TemplateDeploymentStatus {
  PENDING = 'PENDING',
  DEPLOYING = 'DEPLOYING',
  DEPLOYED = 'DEPLOYED',
  FAILED = 'FAILED',
}

export enum VolumeStatus {
  PENDING = 'PENDING',
  BOUND = 'BOUND',
  RELEASED = 'RELEASED',
  FAILED = 'FAILED',
}

export enum ServiceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

export enum RepositoryProvider {
  GITHUB = 'github',
  GITLAB = 'gitlab',
  BITBUCKET = 'bitbucket',
}

// Deployment types
export interface Deployment {
  id: string;
  serviceId: string;
  name: string;
  status: DeploymentStatus;

  // Build information
  imageUrl: string | null;
  imageTag: string | null;
  buildLogs: string | null;
  gitCommitSha: string | null;
  gitCommitMessage: string | null;
  gitAuthor: string | null;

  // Runtime configuration (can override service defaults)
  port: number | null;
  replicas: number | null;
  cpuLimit: string | null;
  memoryLimit: string | null;
  cpuRequest: string | null;
  memoryRequest: string | null;
  healthCheckPath: string | null;

  // Runtime logs
  deploymentLogs: string | null;

  // Lifecycle
  deployedAt: Date | null;
  stoppedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum DeploymentStatus {
  PENDING = 'PENDING',
  BUILDING = 'BUILDING',
  DEPLOYING = 'DEPLOYING',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  FAILED = 'FAILED',
  CRASHED = 'CRASHED',
}

// Environment Variable types
export interface EnvironmentVariable {
  id: string;
  serviceId: string | null;
  deploymentId: string | null;
  key: string;
  valueEncrypted: string;
  valueIv: string;
  isSecret: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Domain types
export interface Domain {
  id: string;
  serviceId: string;
  domain: string;
  verificationCode: string | null;
  isVerified: boolean;
  sslCertificate: string | null;
  sslKey: string | null;
  sslExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Build Queue types
export interface BuildQueueItem {
  id: string;
  serviceId: string;
  deploymentId: string;
  status: string;
  buildStartTime: Date | null;
  buildEndTime: Date | null;
  buildDurationSeconds: number | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription types
export interface Subscription {
  id: string;
  workspaceId: string;
  plan: SubscriptionPlan;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  PAST_DUE = 'PAST_DUE',
  TRIALING = 'TRIALING',
}

// Usage Record types
export interface UsageRecord {
  id: string;
  userId: string;
  resourceType: string;
  amount: number;
  unit: string;
  recordedAt: Date;
  billingPeriod: string;
  createdAt: Date;
}

// Invoice types
export interface Invoice {
  id: string;
  workspaceId: string;
  stripeInvoiceId: string | null;
  amount: number;
  currency: string;
  status: string;
  dueDate: Date | null;
  paidAt: Date | null;
  createdAt: Date;
}

// Audit Log types
export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// GDPR types
export interface GdprConsent {
  id: string;
  userId: string;
  consentType: string;
  consentVersion: string;
  consentGiven: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface GdprDataRequest {
  id: string;
  userId: string;
  requestType: string;
  status: string;
  downloadUrl: string | null;
  expiresAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

// Webhook Event types
export interface WebhookEvent {
  id: string;
  serviceId: string;
  provider: string;
  eventType: string;
  payload: Record<string, any>;
  signature: string | null;
  processed: boolean;
  processedAt: Date | null;
  error: string | null;
  createdAt: Date;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
}

// GitHub App types
export interface GitHubInstallation {
  id: string;
  userId: string;
  installationId: number;
  accountLogin: string;
  accountType: string;
  accountAvatarUrl: string | null;
  permissions: Record<string, string> | null;
  suspendedAt: Date | null;
  uninstalledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  language: string | null;
  defaultBranch: string;
  updatedAt: string;
  htmlUrl: string;
}

export interface GitHubBranch {
  name: string;
  isDefault: boolean;
  commitSha: string;
}

// Project allocation stats (computed from DB)
export interface ProjectAllocationStats {
  serviceCount: number;
  activeDeploymentCount: number;
  totalDeploymentCount: number;
  buildMinutesUsed: number;
  allocatedCpuMillicores: number;
  allocatedMemoryBytes: number;
  uptimeSeconds: number;
  plan: {
    name: string;
    limits: {
      maxCpuCores: number;
      maxMemoryGb: number;
      buildMinutesPerMonth: number;
      maxDeployments: number;
    };
  };
}

// Live metrics from K8s metrics-server
export interface DeploymentLiveMetrics {
  deploymentId: string;
  serviceName: string;
  cpuUsageMillicores: number;
  cpuLimitMillicores: number;
  memoryUsageBytes: number;
  memoryLimitBytes: number;
  podCount: number;
}

export interface ProjectLiveMetrics {
  deployments: DeploymentLiveMetrics[];
  totalCpuUsageMillicores: number;
  totalMemoryUsageBytes: number;
}

// Build status enum
export enum BuildStatus {
  QUEUED = 'QUEUED',
  BUILDING = 'BUILDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// Queue Job types
export interface BuildJobPayload {
  serviceId: string;
  deploymentId: string;
  gitCommitSha: string;
  gitBranch: string;
  gitAuthor: string;
  gitMessage: string;
  githubInstallationId?: number;
  githubRepoFullName?: string;
}

export interface DeployJobPayload {
  deploymentId: string;
  serviceId: string;
  workspaceId: string;
}

// Kubernetes resource types
export interface KubiduDeploySpec {
  serviceId: string;
  deploymentId: string;
  workspaceId: string;
  image: string;
  replicas: number;
  resources: {
    limits: {
      cpu: string;
      memory: string;
    };
    requests: {
      cpu: string;
      memory: string;
    };
  };
  port: number;
  env: Array<{
    name: string;
    valueFrom: {
      secretKeyRef: {
        name: string;
        key: string;
      };
    };
  }>;
  healthCheck: {
    path: string;
    initialDelaySeconds?: number;
    periodSeconds?: number;
  };
}

// DTO types for API requests/responses
export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  gdprConsents: {
    termsOfService: boolean;
    privacyPolicy: boolean;
    marketing?: boolean;
  };
}

export interface CreateWorkspaceRequest {
  name: string;
  avatarUrl?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  avatarUrl?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: WorkspaceRole;
}

export interface UpdateMemberRoleRequest {
  role: WorkspaceRole;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface CreateServiceRequest {
  name: string;
  serviceType: ServiceType;

  // GitHub source
  repositoryUrl?: string;
  repositoryProvider?: RepositoryProvider;
  repositoryBranch?: string;
  githubInstallationId?: string;
  githubRepoFullName?: string;

  // Docker image source
  dockerImage?: string;
  dockerTag?: string;

  // Default service configuration
  defaultPort?: number;
  defaultReplicas?: number;
  defaultCpuLimit?: string;
  defaultMemoryLimit?: string;
  defaultCpuRequest?: string;
  defaultMemoryRequest?: string;
  defaultHealthCheckPath?: string;
  autoDeploy?: boolean;
}

export interface UpdateServiceRequest {
  name?: string;
  repositoryBranch?: string;
  dockerTag?: string;
  defaultPort?: number;
  defaultReplicas?: number;
  defaultCpuLimit?: string;
  defaultMemoryLimit?: string;
  defaultCpuRequest?: string;
  defaultMemoryRequest?: string;
  defaultHealthCheckPath?: string;
  autoDeploy?: boolean;
  status?: ServiceStatus;
}

export interface CreateDeploymentRequest {
  serviceId: string;
  name?: string;
}

export interface SetEnvironmentVariableRequest {
  key: string;
  value: string;
  isSecret?: boolean;
}

export interface AddDomainRequest {
  domain: string;
  sslEnabled?: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Template types
export interface Template {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  definition: TemplateDefinition;
  isOfficial: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateDefinition {
  services: TemplateServiceDef[];
}

export interface TemplateServiceDef {
  name: string;
  image: string;
  tag?: string;
  command?: string[]; // Container command (entrypoint override)
  args?: string[]; // Container args
  env?: Record<string, TemplateEnvValue>;
  volumes?: TemplateVolumeDef[];
  port?: number;
  public?: boolean;
  replicas?: number;
  cpuLimit?: string;
  memoryLimit?: string;
}

export type TemplateEnvValue =
  | string // static value
  | { generate: 'secret' | 'uuid' } // generate: secret (random), uuid
  | { ref: string } // ref: "mysql.env.PASSWORD" or "mysql.hostname"
  | { input: { label: string; default?: string; required?: boolean } }; // user input

export interface TemplateVolumeDef {
  name: string;
  mountPath: string;
  size: string; // e.g., "10Gi"
}

export interface TemplateDeployment {
  id: string;
  templateId: string;
  projectId: string;
  status: TemplateDeploymentStatus;
  statusMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeployTemplateRequest {
  templateId: string;
  inputs?: Record<string, string>; // User-provided values for { input: ... } env vars
}

// Volume types
export interface Volume {
  id: string;
  projectId: string;
  serviceId: string | null;
  templateDeploymentId: string | null;
  name: string;
  mountPath: string;
  size: string;
  status: VolumeStatus;
  boundAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
