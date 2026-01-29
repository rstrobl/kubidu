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
export declare enum UserStatus {
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    DELETED = "DELETED"
}
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
export declare enum ApiKeyPermission {
    READ = "read",
    WRITE = "write",
    ADMIN = "admin"
}
export interface Project {
    id: string;
    userId: string;
    name: string;
    slug: string;
    description: string | null;
    status: ProjectStatus;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
export declare enum ProjectStatus {
    ACTIVE = "ACTIVE",
    ARCHIVED = "ARCHIVED",
    DELETED = "DELETED"
}
export interface Service {
    id: string;
    projectId: string;
    name: string;
    serviceType: ServiceType;
    repositoryUrl: string | null;
    repositoryProvider: RepositoryProvider | null;
    repositoryBranch: string | null;
    githubInstallationId: string | null;
    githubRepoFullName: string | null;
    dockerImage: string | null;
    dockerTag: string | null;
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
export declare enum ServiceType {
    GITHUB = "GITHUB",
    DOCKER_IMAGE = "DOCKER_IMAGE"
}
export declare enum ServiceStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    DELETED = "DELETED"
}
export declare enum RepositoryProvider {
    GITHUB = "github",
    GITLAB = "gitlab",
    BITBUCKET = "bitbucket"
}
export interface Deployment {
    id: string;
    serviceId: string;
    name: string;
    status: DeploymentStatus;
    imageUrl: string | null;
    imageTag: string | null;
    buildLogs: string | null;
    gitCommitSha: string | null;
    gitCommitMessage: string | null;
    gitAuthor: string | null;
    port: number | null;
    replicas: number | null;
    cpuLimit: string | null;
    memoryLimit: string | null;
    cpuRequest: string | null;
    memoryRequest: string | null;
    healthCheckPath: string | null;
    deploymentLogs: string | null;
    deployedAt: Date | null;
    stoppedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare enum DeploymentStatus {
    PENDING = "PENDING",
    BUILDING = "BUILDING",
    DEPLOYING = "DEPLOYING",
    RUNNING = "RUNNING",
    STOPPED = "STOPPED",
    FAILED = "FAILED",
    CRASHED = "CRASHED"
}
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
export interface Subscription {
    id: string;
    userId: string;
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
export declare enum SubscriptionPlan {
    FREE = "FREE",
    STARTER = "STARTER",
    PRO = "PRO",
    ENTERPRISE = "ENTERPRISE"
}
export declare enum SubscriptionStatus {
    ACTIVE = "ACTIVE",
    CANCELED = "CANCELED",
    PAST_DUE = "PAST_DUE",
    TRIALING = "TRIALING"
}
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
export interface Invoice {
    id: string;
    userId: string;
    stripeInvoiceId: string | null;
    amount: number;
    currency: string;
    status: string;
    dueDate: Date | null;
    paidAt: Date | null;
    createdAt: Date;
}
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
export declare enum BuildStatus {
    QUEUED = "QUEUED",
    BUILDING = "BUILDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}
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
    userId: string;
}
export interface KubiduDeploySpec {
    serviceId: string;
    deploymentId: string;
    userId: string;
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
    repositoryUrl?: string;
    repositoryProvider?: RepositoryProvider;
    repositoryBranch?: string;
    githubInstallationId?: string;
    githubRepoFullName?: string;
    dockerImage?: string;
    dockerTag?: string;
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
