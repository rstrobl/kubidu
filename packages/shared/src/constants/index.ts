// Resource limits
export const DEFAULT_RESOURCE_LIMITS = {
  CPU_REQUEST: '100m',
  CPU_LIMIT: '1000m',
  MEMORY_REQUEST: '128Mi',
  MEMORY_LIMIT: '512Mi',
  REPLICAS: 1,
  PORT: 8080,
  HEALTH_CHECK_PATH: '/',
} as const;

// User namespace resource quotas
export const USER_RESOURCE_QUOTA = {
  MAX_CPU_REQUESTS: '4',
  MAX_CPU_LIMITS: '8',
  MAX_MEMORY_REQUESTS: '8Gi',
  MAX_MEMORY_LIMITS: '16Gi',
  MAX_STORAGE: '50Gi',
  MAX_PODS: 20,
  MAX_SERVICES: 10,
  MAX_CONFIGMAPS: 20,
  MAX_SECRETS: 20,
  MAX_PVC: 5,
} as const;

// Subscription plan limits
export const PLAN_LIMITS = {
  free: {
    maxProjects: 2,
    maxDeployments: 2,
    maxCpuCores: 1,
    maxMemoryGb: 1,
    maxStorageGb: 10,
    buildMinutesPerMonth: 100,
    bandwidthGbPerMonth: 10,
  },
  starter: {
    maxProjects: 10,
    maxDeployments: 10,
    maxCpuCores: 4,
    maxMemoryGb: 8,
    maxStorageGb: 50,
    buildMinutesPerMonth: 500,
    bandwidthGbPerMonth: 100,
  },
  pro: {
    maxProjects: 50,
    maxDeployments: 50,
    maxCpuCores: 16,
    maxMemoryGb: 32,
    maxStorageGb: 200,
    buildMinutesPerMonth: 2000,
    bandwidthGbPerMonth: 500,
  },
  enterprise: {
    maxProjects: -1, // unlimited
    maxDeployments: -1,
    maxCpuCores: -1,
    maxMemoryGb: -1,
    maxStorageGb: -1,
    buildMinutesPerMonth: -1,
    bandwidthGbPerMonth: -1,
  },
} as const;

// Pricing (in cents)
export const PRICING = {
  plans: {
    free: 0,
    starter: 2900, // $29/month
    pro: 9900, // $99/month
    enterprise: 49900, // $499/month
  },
  usage: {
    cpuPerCoreHour: 10, // $0.10/core-hour
    memoryPerGbHour: 5, // $0.05/GB-hour
    bandwidthPerGb: 10, // $0.10/GB
    buildPerMinute: 1, // $0.01/minute
  },
} as const;

// Build configuration
export const BUILD_CONFIG = {
  MAX_BUILD_TIME_MINUTES: 30,
  MAX_IMAGE_SIZE_MB: 2048,
  DEFAULT_TIMEOUT_SECONDS: 1800,
  MAX_CONCURRENT_BUILDS: 5,
} as const;

// Domain configuration
export const DOMAIN_CONFIG = {
  DEFAULT_DOMAIN_SUFFIX: 'kubidu.io',
  SSL_CERT_PROVIDER: 'letsencrypt',
  VERIFICATION_TOKEN_LENGTH: 32,
  DNS_VERIFICATION_TIMEOUT_HOURS: 24,
} as const;

// Security configuration
export const SECURITY_CONFIG = {
  JWT_EXPIRY_SECONDS: 3600, // 1 hour
  REFRESH_TOKEN_EXPIRY_SECONDS: 2592000, // 30 days
  API_KEY_PREFIX_LENGTH: 8,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBER: true,
  PASSWORD_REQUIRE_SPECIAL: false,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_MINUTES: 15,
} as const;

// GDPR configuration
export const GDPR_CONFIG = {
  DATA_EXPORT_EXPIRY_DAYS: 30,
  DATA_DELETION_GRACE_PERIOD_DAYS: 14,
  CONSENT_VERSION: '1.0.0',
} as const;

// Kubernetes configuration
export const K8S_CONFIG = {
  NAMESPACE_PREFIX: 'user-',
  LABEL_USER_ID: 'kubidu.io/user-id',
  LABEL_PROJECT_ID: 'kubidu.io/project-id',
  LABEL_DEPLOYMENT_ID: 'kubidu.io/deployment-id',
  LABEL_MANAGED_BY: 'kubidu.io/managed-by',
  MANAGED_BY_VALUE: 'kubidu-platform',
} as const;

// Queue configuration
export const QUEUE_CONFIG = {
  BUILD_QUEUE_NAME: 'build-jobs',
  DEPLOY_QUEUE_NAME: 'deploy-jobs',
  DEFAULT_JOB_ATTEMPTS: 3,
  JOB_TIMEOUT_MS: 1800000, // 30 minutes
  BACKOFF_DELAY_MS: 5000,
} as const;

// Audit log actions
export const AUDIT_ACTIONS = {
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_REGISTER: 'user.register',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  PROJECT_CREATE: 'project.create',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',
  DEPLOYMENT_CREATE: 'deployment.create',
  DEPLOYMENT_START: 'deployment.start',
  DEPLOYMENT_STOP: 'deployment.stop',
  DEPLOYMENT_DELETE: 'deployment.delete',
  ENV_VAR_CREATE: 'env_var.create',
  ENV_VAR_UPDATE: 'env_var.update',
  ENV_VAR_DELETE: 'env_var.delete',
  DOMAIN_ADD: 'domain.add',
  DOMAIN_VERIFY: 'domain.verify',
  DOMAIN_DELETE: 'domain.delete',
  SUBSCRIPTION_CREATE: 'subscription.create',
  SUBSCRIPTION_UPDATE: 'subscription.update',
  SUBSCRIPTION_CANCEL: 'subscription.cancel',
  GDPR_EXPORT_REQUEST: 'gdpr.export_request',
  GDPR_DELETE_REQUEST: 'gdpr.delete_request',
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error codes
export const ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  DEPLOYMENT_NOT_FOUND: 'DEPLOYMENT_NOT_FOUND',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  BUILD_FAILED: 'BUILD_FAILED',
  DEPLOYMENT_FAILED: 'DEPLOYMENT_FAILED',
  DOMAIN_VERIFICATION_FAILED: 'DOMAIN_VERIFICATION_FAILED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
} as const;
