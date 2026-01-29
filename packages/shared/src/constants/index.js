"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CODES = exports.HTTP_STATUS = exports.AUDIT_ACTIONS = exports.QUEUE_CONFIG = exports.K8S_CONFIG = exports.GDPR_CONFIG = exports.SECURITY_CONFIG = exports.DOMAIN_CONFIG = exports.BUILD_CONFIG = exports.PRICING = exports.PLAN_LIMITS = exports.USER_RESOURCE_QUOTA = exports.DEFAULT_RESOURCE_LIMITS = void 0;
exports.DEFAULT_RESOURCE_LIMITS = {
    CPU_REQUEST: '100m',
    CPU_LIMIT: '1000m',
    MEMORY_REQUEST: '128Mi',
    MEMORY_LIMIT: '512Mi',
    REPLICAS: 1,
    PORT: 8080,
    HEALTH_CHECK_PATH: '/',
};
exports.USER_RESOURCE_QUOTA = {
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
};
exports.PLAN_LIMITS = {
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
        maxProjects: -1,
        maxDeployments: -1,
        maxCpuCores: -1,
        maxMemoryGb: -1,
        maxStorageGb: -1,
        buildMinutesPerMonth: -1,
        bandwidthGbPerMonth: -1,
    },
};
exports.PRICING = {
    plans: {
        free: 0,
        starter: 2900,
        pro: 9900,
        enterprise: 49900,
    },
    usage: {
        cpuPerCoreHour: 10,
        memoryPerGbHour: 5,
        bandwidthPerGb: 10,
        buildPerMinute: 1,
    },
};
exports.BUILD_CONFIG = {
    MAX_BUILD_TIME_MINUTES: 30,
    MAX_IMAGE_SIZE_MB: 2048,
    DEFAULT_TIMEOUT_SECONDS: 1800,
    MAX_CONCURRENT_BUILDS: 5,
};
exports.DOMAIN_CONFIG = {
    DEFAULT_DOMAIN_SUFFIX: 'kubidu.io',
    SSL_CERT_PROVIDER: 'letsencrypt',
    VERIFICATION_TOKEN_LENGTH: 32,
    DNS_VERIFICATION_TIMEOUT_HOURS: 24,
};
exports.SECURITY_CONFIG = {
    JWT_EXPIRY_SECONDS: 3600,
    REFRESH_TOKEN_EXPIRY_SECONDS: 2592000,
    API_KEY_PREFIX_LENGTH: 8,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_REQUIRE_UPPERCASE: true,
    PASSWORD_REQUIRE_LOWERCASE: true,
    PASSWORD_REQUIRE_NUMBER: true,
    PASSWORD_REQUIRE_SPECIAL: false,
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_LOCKOUT_MINUTES: 15,
};
exports.GDPR_CONFIG = {
    DATA_EXPORT_EXPIRY_DAYS: 30,
    DATA_DELETION_GRACE_PERIOD_DAYS: 14,
    CONSENT_VERSION: '1.0.0',
};
exports.K8S_CONFIG = {
    NAMESPACE_PREFIX: 'user-',
    LABEL_USER_ID: 'kubidu.io/user-id',
    LABEL_PROJECT_ID: 'kubidu.io/project-id',
    LABEL_DEPLOYMENT_ID: 'kubidu.io/deployment-id',
    LABEL_MANAGED_BY: 'kubidu.io/managed-by',
    MANAGED_BY_VALUE: 'kubidu-platform',
};
exports.QUEUE_CONFIG = {
    BUILD_QUEUE_NAME: 'build-jobs',
    DEPLOY_QUEUE_NAME: 'deploy-jobs',
    DEFAULT_JOB_ATTEMPTS: 3,
    JOB_TIMEOUT_MS: 1800000,
    BACKOFF_DELAY_MS: 5000,
};
exports.AUDIT_ACTIONS = {
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
};
exports.HTTP_STATUS = {
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
};
exports.ERROR_CODES = {
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
};
//# sourceMappingURL=index.js.map