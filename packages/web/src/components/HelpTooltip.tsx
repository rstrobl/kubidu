import { useState } from 'react';

interface HelpTooltipProps {
  content: string | React.ReactNode;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
}

export function HelpTooltip({
  content,
  title,
  position = 'top',
  children,
}: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 dark:border-t-gray-700 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 dark:border-b-gray-700 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 dark:border-l-gray-700 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 dark:border-r-gray-700 border-y-transparent border-l-transparent',
  };

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full"
        aria-label="Help"
      >
        {children || (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </button>

      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} animate-fade-in`}
          role="tooltip"
        >
          <div className="bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg max-w-xs p-3">
            {title && (
              <div className="font-medium mb-1 text-primary-300">{title}</div>
            )}
            <div className="text-gray-200">{content}</div>
          </div>
          <div
            className={`absolute border-4 ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
}

// Common help texts for reuse
export const HELP_TEXTS = {
  // Service settings
  autoDeploy: 'Automatically deploy when new commits are pushed to the connected branch.',
  replicas: 'Number of instances to run. More replicas = higher availability.',
  cpuLimit: 'Maximum CPU your service can use. 1000m = 1 CPU core.',
  memoryLimit: 'Maximum memory your service can use. If exceeded, the service may be restarted.',
  healthCheck: 'Path to check if your service is healthy. Returns 200 = healthy.',
  
  // Environment variables
  envSecret: 'Secret values are encrypted and not visible in logs.',
  envShared: 'Shared variables can be referenced by other services in this project.',
  envReference: 'Reference another service\'s variable using ${SERVICE.VAR} syntax.',
  
  // Deployments
  rollback: 'Restore a previous version of your service. This creates a new deployment.',
  buildLogs: 'Logs from building your Docker image.',
  runtimeLogs: 'Logs from your running application.',
  
  // Domains
  customDomain: 'Add your own domain. You\'ll need to configure DNS records.',
  subdomain: 'Your service is accessible at this *.kubidu.io subdomain.',
  
  // 2FA
  twoFactor: 'Two-factor authentication adds an extra layer of security to your account.',
  backupCodes: 'Use these codes if you lose access to your authenticator app.',
  
  // Team
  roleAdmin: 'Full access: manage members, billing, and all settings.',
  roleMember: 'Can create and manage services and deployments.',
  roleDeployer: 'Can only trigger deployments, cannot modify settings.',
  
  // Audit
  auditLog: 'All actions are logged for security and compliance (ISO 27001).',
  
  // Billing
  usageLimits: 'Your plan limits. Upgrade for more resources.',
};
