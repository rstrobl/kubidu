import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  learnMoreUrl?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  learnMoreUrl,
  className = '',
}: EmptyStateProps) {
  return (
    <div 
      className={`text-center py-12 px-4 ${className}`}
      role="status"
      aria-label={title}
    >
      {icon && (
        <div className="mb-4 flex justify-center" aria-hidden="true">
          {typeof icon === 'string' ? (
            <span className="text-5xl">{icon}</span>
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
              {icon}
            </div>
          )}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto mb-6">{description}</p>
      {(action || secondaryAction || learnMoreUrl) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          {action && (
            <button
              onClick={action.onClick}
              className={`btn ${action.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'} inline-flex items-center gap-2`}
              aria-label={action.label}
            >
              {action.icon}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="btn btn-secondary"
            >
              {secondaryAction.label}
            </button>
          )}
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Learn more →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// Preset empty states for common scenarios
export function EmptyProjects({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <EmptyState
      icon="🚀"
      title="No projects yet"
      description="Create your first project to start deploying services to the cloud."
      action={{
        label: 'Create Project',
        onClick: onCreateProject,
      }}
    />
  );
}

export function EmptyServices({ onAddService }: { onAddService: () => void }) {
  return (
    <EmptyState
      icon="📦"
      title="No services in this project"
      description="Add a service from GitHub or a Docker image to get started."
      action={{
        label: 'Add Service',
        onClick: onAddService,
      }}
    />
  );
}

export function EmptyDeployments() {
  return (
    <EmptyState
      icon="🔄"
      title="No deployments yet"
      description="Deploy your service to see it running in the cloud."
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon="🔔"
      title="All caught up!"
      description="You have no notifications at the moment."
    />
  );
}

export function EmptyDomains({ onAddDomain }: { onAddDomain: () => void }) {
  return (
    <EmptyState
      icon="🌐"
      title="No custom domains"
      description="Add a custom domain to access your service with your own URL."
      action={{
        label: 'Add Domain',
        onClick: onAddDomain,
      }}
    />
  );
}

export function EmptyEnvVars({ onAddVariable }: { onAddVariable: () => void }) {
  return (
    <EmptyState
      icon="🔐"
      title="No environment variables"
      description="Add environment variables to configure your service."
      action={{
        label: 'Add Variable',
        onClick: onAddVariable,
      }}
    />
  );
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon="🔍"
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try a different search term.`}
    />
  );
}

export function EmptyWorkspaceMembers({ onInvite }: { onInvite: () => void }) {
  return (
    <EmptyState
      icon="👥"
      title="Just you here"
      description="Invite team members to collaborate on projects."
      action={{
        label: 'Invite Member',
        onClick: onInvite,
      }}
    />
  );
}
