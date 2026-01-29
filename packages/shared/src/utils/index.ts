import crypto from 'crypto';

/**
 * Generate a random API key
 */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `kubidu_${crypto.randomBytes(32).toString('hex')}`;
  const prefix = key.substring(0, 15); // kubidu_ + first 8 chars
  const hash = crypto.createHash('sha256').update(key).digest('hex');

  return { key, prefix, hash };
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Slugify a string for use in URLs
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

/**
 * Generate a Kubernetes namespace name from user ID
 */
export function getUserNamespace(userId: string): string {
  return `user-${userId}`;
}

/**
 * Generate a deployment name
 */
export function getDeploymentName(deploymentId: string): string {
  return `deployment-${deploymentId}`;
}

/**
 * Generate a service name
 */
export function getServiceName(deploymentId: string): string {
  return `service-${deploymentId}`;
}

/**
 * Generate an ingress name
 */
export function getIngressName(deploymentId: string): string {
  return `ingress-${deploymentId}`;
}

/**
 * Generate a secret name for environment variables
 */
export function getEnvSecretName(deploymentId: string): string {
  return `env-${deploymentId}`;
}

/**
 * Generate a default subdomain for a deployment
 */
export function generateSubdomain(projectSlug: string, deploymentId: string, baseDomain: string = 'kubidu.io'): string {
  const shortId = deploymentId.substring(0, 8);
  return `${projectSlug}-${shortId}.${baseDomain}`;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

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

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: any): any {
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'key', 'authorization'];

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }

  const masked: any = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

    if (isSensitive && typeof value === 'string') {
      masked[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Calculate build duration in seconds
 */
export function calculateBuildDuration(startTime: Date, endTime: Date): number {
  return Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Parse Kubernetes resource string (e.g., "1000m" -> 1, "2Gi" -> 2048)
 */
export function parseK8sResource(resource: string): number {
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

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(userId: string, date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const shortId = userId.substring(0, 8);
  const timestamp = Date.now().toString(36).toUpperCase();

  return `INV-${year}${month}-${shortId}-${timestamp}`;
}

/**
 * Calculate usage cost based on metric type and quantity
 */
export function calculateUsageCost(metricType: string, quantity: number, pricing: any): number {
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

/**
 * Check if user has exceeded quota
 */
export function isQuotaExceeded(usage: number, limit: number): boolean {
  if (limit === -1) return false; // unlimited
  return usage >= limit;
}

/**
 * Parse K8s CPU string to millicores
 * '1000m' → 1000, '1' → 1000, '500m' → 500
 */
export function parseK8sCpu(str: string): number {
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

/**
 * Parse K8s memory string to bytes
 * '512Mi' → 536870912, '1Gi' → 1073741824, '128Ki' → 131072
 */
export function parseK8sMemory(str: string): number {
  const match = str.match(/^(\d+)(Ki|Mi|Gi|Ti)?$/);
  if (!match) return 0;
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

/**
 * Format CPU millicores for display
 * 1000 → '1 core', 500 → '500m', 2000 → '2 cores'
 */
export function formatCpuMillicores(n: number): string {
  if (n >= 1000 && n % 1000 === 0) {
    const cores = n / 1000;
    return `${cores} ${cores === 1 ? 'core' : 'cores'}`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)} cores`;
  }
  return `${n}m`;
}

/**
 * Format bytes for display as MiB/GiB
 * 536870912 → '512 MiB', 1073741824 → '1 GiB'
 */
export function formatMemoryBytes(n: number): string {
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

/**
 * Get current billing period as YYYY-MM string
 */
export function getCurrentBillingPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Sanitize Git URL for display
 */
export function sanitizeGitUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove credentials if present
    urlObj.username = '';
    urlObj.password = '';
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Extract repository owner and name from Git URL
 */
export function parseGitUrl(url: string): { owner: string; repo: string } | null {
  // Handle various Git URL formats
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

/**
 * Delay execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, backoffMultiplier = 2 } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const waitTime = delayMs * Math.pow(backoffMultiplier, attempt - 1);
        await delay(waitTime);
      }
    }
  }

  throw lastError || new Error('Max retry attempts exceeded');
}
