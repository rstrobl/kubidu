import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      {icon && (
        <div className="mb-4 flex justify-center">
          {typeof icon === 'string' ? (
            <span className="text-5xl">{icon}</span>
          ) : (
            icon
          )}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-sm mx-auto mb-6">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {action && (
            <button
              onClick={action.onClick}
              className={`btn ${action.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}`}
            >
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
