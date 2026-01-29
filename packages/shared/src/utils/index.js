"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateApiKey = generateApiKey;
exports.hashApiKey = hashApiKey;
exports.generateToken = generateToken;
exports.slugify = slugify;
exports.getUserNamespace = getUserNamespace;
exports.getDeploymentName = getDeploymentName;
exports.getServiceName = getServiceName;
exports.getIngressName = getIngressName;
exports.getEnvSecretName = getEnvSecretName;
exports.generateSubdomain = generateSubdomain;
exports.isValidEmail = isValidEmail;
exports.validatePassword = validatePassword;
exports.maskSensitiveData = maskSensitiveData;
exports.calculateBuildDuration = calculateBuildDuration;
exports.formatBytes = formatBytes;
exports.parseK8sResource = parseK8sResource;
exports.generateInvoiceNumber = generateInvoiceNumber;
exports.calculateUsageCost = calculateUsageCost;
exports.isQuotaExceeded = isQuotaExceeded;
exports.parseK8sCpu = parseK8sCpu;
exports.parseK8sMemory = parseK8sMemory;
exports.formatCpuMillicores = formatCpuMillicores;
exports.formatMemoryBytes = formatMemoryBytes;
exports.getCurrentBillingPeriod = getCurrentBillingPeriod;
exports.sanitizeGitUrl = sanitizeGitUrl;
exports.parseGitUrl = parseGitUrl;
exports.delay = delay;
exports.retry = retry;
const crypto_1 = __importDefault(require("crypto"));
function generateApiKey() {
    const key = `kubidu_${crypto_1.default.randomBytes(32).toString('hex')}`;
    const prefix = key.substring(0, 15);
    const hash = crypto_1.default.createHash('sha256').update(key).digest('hex');
    return { key, prefix, hash };
}
function hashApiKey(key) {
    return crypto_1.default.createHash('sha256').update(key).digest('hex');
}
function generateToken(length = 32) {
    return crypto_1.default.randomBytes(length).toString('hex');
}
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}
function getUserNamespace(userId) {
    return `user-${userId}`;
}
function getDeploymentName(deploymentId) {
    return `deployment-${deploymentId}`;
}
function getServiceName(deploymentId) {
    return `service-${deploymentId}`;
}
function getIngressName(deploymentId) {
    return `ingress-${deploymentId}`;
}
function getEnvSecretName(deploymentId) {
    return `env-${deploymentId}`;
}
function generateSubdomain(projectSlug, deploymentId, baseDomain = 'kubidu.io') {
    const shortId = deploymentId.substring(0, 8);
    return `${projectSlug}-${shortId}.${baseDomain}`;
}
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function validatePassword(password) {
    const errors = [];
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
function maskSensitiveData(data) {
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'key', 'authorization'];
    if (typeof data !== 'object' || data === null) {
        return data;
    }
    if (Array.isArray(data)) {
        return data.map(maskSensitiveData);
    }
    const masked = {};
    for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));
        if (isSensitive && typeof value === 'string') {
            masked[key] = '***REDACTED***';
        }
        else if (typeof value === 'object' && value !== null) {
            masked[key] = maskSensitiveData(value);
        }
        else {
            masked[key] = value;
        }
    }
    return masked;
}
function calculateBuildDuration(startTime, endTime) {
    return Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
}
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
function parseK8sResource(resource) {
    const cpuMatch = resource.match(/^(\d+)m$/);
    if (cpuMatch) {
        return parseInt(cpuMatch[1]);
    }
    const memoryMatch = resource.match(/^(\d+)(Ki|Mi|Gi|Ti)?$/);
    if (memoryMatch) {
        const value = parseInt(memoryMatch[1]);
        const unit = memoryMatch[2] || '';
        switch (unit) {
            case 'Ki':
                return value / 1024;
            case 'Mi':
                return value;
            case 'Gi':
                return value * 1024;
            case 'Ti':
                return value * 1024 * 1024;
            default:
                return value;
        }
    }
    return 0;
}
function generateInvoiceNumber(userId, date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const shortId = userId.substring(0, 8);
    const timestamp = Date.now().toString(36).toUpperCase();
    return `INV-${year}${month}-${shortId}-${timestamp}`;
}
function calculateUsageCost(metricType, quantity, pricing) {
    switch (metricType) {
        case 'cpu_seconds':
            return Math.ceil((quantity / 3600) * pricing.cpuPerCoreHour);
        case 'memory_mb_seconds':
            return Math.ceil((quantity / 3600 / 1024) * pricing.memoryPerGbHour);
        case 'bandwidth_gb':
            return Math.ceil(quantity * pricing.bandwidthPerGb);
        case 'build_minutes':
            return Math.ceil(quantity * pricing.buildPerMinute);
        default:
            return 0;
    }
}
function isQuotaExceeded(usage, limit) {
    if (limit === -1)
        return false;
    return usage >= limit;
}
function parseK8sCpu(str) {
    const milliMatch = str.match(/^(\d+)m$/);
    if (milliMatch) {
        return parseInt(milliMatch[1], 10);
    }
    const coreMatch = str.match(/^(\d+\.?\d*)$/);
    if (coreMatch) {
        return Math.round(parseFloat(coreMatch[1]) * 1000);
    }
    return 0;
}
function parseK8sMemory(str) {
    const match = str.match(/^(\d+)(Ki|Mi|Gi|Ti)?$/);
    if (!match)
        return 0;
    const value = parseInt(match[1], 10);
    const unit = match[2] || '';
    switch (unit) {
        case 'Ki': return value * 1024;
        case 'Mi': return value * 1024 * 1024;
        case 'Gi': return value * 1024 * 1024 * 1024;
        case 'Ti': return value * 1024 * 1024 * 1024 * 1024;
        default: return value;
    }
}
function formatCpuMillicores(n) {
    if (n >= 1000 && n % 1000 === 0) {
        const cores = n / 1000;
        return `${cores} ${cores === 1 ? 'core' : 'cores'}`;
    }
    if (n >= 1000) {
        return `${(n / 1000).toFixed(1)} cores`;
    }
    return `${n}m`;
}
function formatMemoryBytes(n) {
    const gib = n / (1024 * 1024 * 1024);
    if (gib >= 1) {
        return gib % 1 === 0 ? `${gib} GiB` : `${gib.toFixed(1)} GiB`;
    }
    const mib = n / (1024 * 1024);
    if (mib >= 1) {
        return mib % 1 === 0 ? `${mib} MiB` : `${mib.toFixed(1)} MiB`;
    }
    const kib = n / 1024;
    return kib % 1 === 0 ? `${kib} KiB` : `${kib.toFixed(1)} KiB`;
}
function getCurrentBillingPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
function sanitizeGitUrl(url) {
    try {
        const urlObj = new URL(url);
        urlObj.username = '';
        urlObj.password = '';
        return urlObj.toString();
    }
    catch {
        return url;
    }
}
function parseGitUrl(url) {
    const patterns = [
        /github\.com[\/:]([^\/]+)\/([^\/\.]+)/,
        /gitlab\.com[\/:]([^\/]+)\/([^\/\.]+)/,
        /bitbucket\.org[\/:]([^\/]+)\/([^\/\.]+)/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return {
                owner: match[1],
                repo: match[2].replace(/\.git$/, ''),
            };
        }
    }
    return null;
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function retry(fn, options = {}) {
    const { maxAttempts = 3, delayMs = 1000, backoffMultiplier = 2 } = options;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                const waitTime = delayMs * Math.pow(backoffMultiplier, attempt - 1);
                await delay(waitTime);
            }
        }
    }
    throw lastError || new Error('Max retry attempts exceeded');
}
//# sourceMappingURL=index.js.map