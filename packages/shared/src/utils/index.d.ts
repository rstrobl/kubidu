export declare function generateApiKey(): {
    key: string;
    prefix: string;
    hash: string;
};
export declare function hashApiKey(key: string): string;
export declare function generateToken(length?: number): string;
export declare function slugify(text: string): string;
export declare function getUserNamespace(userId: string): string;
export declare function getDeploymentName(deploymentId: string): string;
export declare function getServiceName(deploymentId: string): string;
export declare function getIngressName(deploymentId: string): string;
export declare function getEnvSecretName(deploymentId: string): string;
export declare function generateSubdomain(projectSlug: string, deploymentId: string, baseDomain?: string): string;
export declare function isValidEmail(email: string): boolean;
export declare function validatePassword(password: string): {
    valid: boolean;
    errors: string[];
};
export declare function maskSensitiveData(data: any): any;
export declare function calculateBuildDuration(startTime: Date, endTime: Date): number;
export declare function formatBytes(bytes: number): string;
export declare function parseK8sResource(resource: string): number;
export declare function generateInvoiceNumber(userId: string, date: Date): string;
export declare function calculateUsageCost(metricType: string, quantity: number, pricing: any): number;
export declare function isQuotaExceeded(usage: number, limit: number): boolean;
export declare function parseK8sCpu(str: string): number;
export declare function parseK8sMemory(str: string): number;
export declare function formatCpuMillicores(n: number): string;
export declare function formatMemoryBytes(n: number): string;
export declare function getCurrentBillingPeriod(): string;
export declare function sanitizeGitUrl(url: string): string;
export declare function parseGitUrl(url: string): {
    owner: string;
    repo: string;
} | null;
export declare function delay(ms: number): Promise<void>;
export declare function retry<T>(fn: () => Promise<T>, options?: {
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
}): Promise<T>;
