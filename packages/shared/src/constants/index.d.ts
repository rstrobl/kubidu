export declare const DEFAULT_RESOURCE_LIMITS: {
    readonly CPU_REQUEST: "100m";
    readonly CPU_LIMIT: "1000m";
    readonly MEMORY_REQUEST: "128Mi";
    readonly MEMORY_LIMIT: "512Mi";
    readonly REPLICAS: 1;
    readonly PORT: 8080;
    readonly HEALTH_CHECK_PATH: "/";
};
export declare const USER_RESOURCE_QUOTA: {
    readonly MAX_CPU_REQUESTS: "4";
    readonly MAX_CPU_LIMITS: "8";
    readonly MAX_MEMORY_REQUESTS: "8Gi";
    readonly MAX_MEMORY_LIMITS: "16Gi";
    readonly MAX_STORAGE: "50Gi";
    readonly MAX_PODS: 20;
    readonly MAX_SERVICES: 10;
    readonly MAX_CONFIGMAPS: 20;
    readonly MAX_SECRETS: 20;
    readonly MAX_PVC: 5;
};
export declare const PLAN_LIMITS: {
    readonly free: {
        readonly maxProjects: 2;
        readonly maxDeployments: 2;
        readonly maxCpuCores: 1;
        readonly maxMemoryGb: 1;
        readonly maxStorageGb: 10;
        readonly buildMinutesPerMonth: 100;
        readonly bandwidthGbPerMonth: 10;
    };
    readonly starter: {
        readonly maxProjects: 10;
        readonly maxDeployments: 10;
        readonly maxCpuCores: 4;
        readonly maxMemoryGb: 8;
        readonly maxStorageGb: 50;
        readonly buildMinutesPerMonth: 500;
        readonly bandwidthGbPerMonth: 100;
    };
    readonly pro: {
        readonly maxProjects: 50;
        readonly maxDeployments: 50;
        readonly maxCpuCores: 16;
        readonly maxMemoryGb: 32;
        readonly maxStorageGb: 200;
        readonly buildMinutesPerMonth: 2000;
        readonly bandwidthGbPerMonth: 500;
    };
    readonly enterprise: {
        readonly maxProjects: -1;
        readonly maxDeployments: -1;
        readonly maxCpuCores: -1;
        readonly maxMemoryGb: -1;
        readonly maxStorageGb: -1;
        readonly buildMinutesPerMonth: -1;
        readonly bandwidthGbPerMonth: -1;
    };
};
export declare const PRICING: {
    readonly plans: {
        readonly free: 0;
        readonly starter: 2900;
        readonly pro: 9900;
        readonly enterprise: 49900;
    };
    readonly usage: {
        readonly cpuPerCoreHour: 10;
        readonly memoryPerGbHour: 5;
        readonly bandwidthPerGb: 10;
        readonly buildPerMinute: 1;
    };
};
export declare const BUILD_CONFIG: {
    readonly MAX_BUILD_TIME_MINUTES: 30;
    readonly MAX_IMAGE_SIZE_MB: 2048;
    readonly DEFAULT_TIMEOUT_SECONDS: 1800;
    readonly MAX_CONCURRENT_BUILDS: 5;
};
export declare const DOMAIN_CONFIG: {
    readonly DEFAULT_DOMAIN_SUFFIX: "kubidu.io";
    readonly SSL_CERT_PROVIDER: "letsencrypt";
    readonly VERIFICATION_TOKEN_LENGTH: 32;
    readonly DNS_VERIFICATION_TIMEOUT_HOURS: 24;
};
export declare const SECURITY_CONFIG: {
    readonly JWT_EXPIRY_SECONDS: 3600;
    readonly REFRESH_TOKEN_EXPIRY_SECONDS: 2592000;
    readonly API_KEY_PREFIX_LENGTH: 8;
    readonly PASSWORD_MIN_LENGTH: 8;
    readonly PASSWORD_REQUIRE_UPPERCASE: true;
    readonly PASSWORD_REQUIRE_LOWERCASE: true;
    readonly PASSWORD_REQUIRE_NUMBER: true;
    readonly PASSWORD_REQUIRE_SPECIAL: false;
    readonly MAX_LOGIN_ATTEMPTS: 5;
    readonly LOGIN_LOCKOUT_MINUTES: 15;
};
export declare const GDPR_CONFIG: {
    readonly DATA_EXPORT_EXPIRY_DAYS: 30;
    readonly DATA_DELETION_GRACE_PERIOD_DAYS: 14;
    readonly CONSENT_VERSION: "1.0.0";
};
export declare const K8S_CONFIG: {
    readonly NAMESPACE_PREFIX: "user-";
    readonly LABEL_USER_ID: "kubidu.io/user-id";
    readonly LABEL_PROJECT_ID: "kubidu.io/project-id";
    readonly LABEL_DEPLOYMENT_ID: "kubidu.io/deployment-id";
    readonly LABEL_MANAGED_BY: "kubidu.io/managed-by";
    readonly MANAGED_BY_VALUE: "kubidu-platform";
};
export declare const QUEUE_CONFIG: {
    readonly BUILD_QUEUE_NAME: "build-jobs";
    readonly DEPLOY_QUEUE_NAME: "deploy-jobs";
    readonly DEFAULT_JOB_ATTEMPTS: 3;
    readonly JOB_TIMEOUT_MS: 1800000;
    readonly BACKOFF_DELAY_MS: 5000;
};
export declare const AUDIT_ACTIONS: {
    readonly USER_LOGIN: "user.login";
    readonly USER_LOGOUT: "user.logout";
    readonly USER_REGISTER: "user.register";
    readonly USER_UPDATE: "user.update";
    readonly USER_DELETE: "user.delete";
    readonly PROJECT_CREATE: "project.create";
    readonly PROJECT_UPDATE: "project.update";
    readonly PROJECT_DELETE: "project.delete";
    readonly DEPLOYMENT_CREATE: "deployment.create";
    readonly DEPLOYMENT_START: "deployment.start";
    readonly DEPLOYMENT_STOP: "deployment.stop";
    readonly DEPLOYMENT_DELETE: "deployment.delete";
    readonly ENV_VAR_CREATE: "env_var.create";
    readonly ENV_VAR_UPDATE: "env_var.update";
    readonly ENV_VAR_DELETE: "env_var.delete";
    readonly DOMAIN_ADD: "domain.add";
    readonly DOMAIN_VERIFY: "domain.verify";
    readonly DOMAIN_DELETE: "domain.delete";
    readonly SUBSCRIPTION_CREATE: "subscription.create";
    readonly SUBSCRIPTION_UPDATE: "subscription.update";
    readonly SUBSCRIPTION_CANCEL: "subscription.cancel";
    readonly GDPR_EXPORT_REQUEST: "gdpr.export_request";
    readonly GDPR_DELETE_REQUEST: "gdpr.delete_request";
};
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
export declare const ERROR_CODES: {
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS";
    readonly USER_NOT_FOUND: "USER_NOT_FOUND";
    readonly PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND";
    readonly DEPLOYMENT_NOT_FOUND: "DEPLOYMENT_NOT_FOUND";
    readonly QUOTA_EXCEEDED: "QUOTA_EXCEEDED";
    readonly INVALID_TOKEN: "INVALID_TOKEN";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly PERMISSION_DENIED: "PERMISSION_DENIED";
    readonly BUILD_FAILED: "BUILD_FAILED";
    readonly DEPLOYMENT_FAILED: "DEPLOYMENT_FAILED";
    readonly DOMAIN_VERIFICATION_FAILED: "DOMAIN_VERIFICATION_FAILED";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
};
