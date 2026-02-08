import { useState, useEffect, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';


interface Environment {
  id: string;
  name: string;
  slug: string;
  type: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT' | 'PREVIEW';
  isProduction: boolean;
  isDefault: boolean;
  color?: string;
  branch?: string;
}

const ENV_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  PRODUCTION: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  STAGING: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  DEVELOPMENT: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  PREVIEW: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
};

const ENV_ICONS: Record<string, string> = {
  PRODUCTION: '🚀',
  STAGING: '🧪',
  DEVELOPMENT: '💻',
  PREVIEW: '👀',
};

interface EnvironmentSwitcherProps {
  projectId: string;
  currentEnvironmentId?: string;
  onEnvironmentChange: (env: Environment) => void;
}

export function EnvironmentSwitcher({
  projectId,
  currentEnvironmentId,
  onEnvironmentChange,
}: EnvironmentSwitcherProps) {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch environments for the project
  const { data: environments = [], isLoading } = useQuery({
    queryKey: ['environments', projectId],
    queryFn: async () => {
      // For now, return mock data - API will be implemented
      return getMockEnvironments();
    },
    enabled: !!projectId,
  });

  const currentEnvironment = environments.find((e: Environment) => e.id === currentEnvironmentId) 
    || environments.find((e: Environment) => e.isDefault)
    || environments[0];

  if (isLoading) {
    return (
      <div className="animate-pulse h-9 w-32 bg-gray-200 rounded-lg" />
    );
  }

  if (!environments.length) {
    return null;
  }

  const envColors = currentEnvironment 
    ? ENV_COLORS[currentEnvironment.type] || ENV_COLORS.DEVELOPMENT
    : ENV_COLORS.DEVELOPMENT;

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:shadow-sm ${
          currentEnvironment?.type === 'PRODUCTION'
            ? 'border-red-200 bg-red-50 hover:bg-red-100'
            : 'border-gray-200 bg-white hover:bg-gray-50'
        }`}
      >
        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full ${envColors.dot}`} />
        
        {/* Environment name */}
        <span className={`text-sm font-medium ${envColors.text}`}>
          {currentEnvironment?.name || 'Select Environment'}
        </span>

        {/* Dropdown arrow */}
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute left-0 mt-2 w-64 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Environments
            </div>

            {environments.map((env: Environment) => {
              const colors = ENV_COLORS[env.type] || ENV_COLORS.DEVELOPMENT;
              const isSelected = env.id === currentEnvironment?.id;

              return (
                <Menu.Item key={env.id}>
                  {({ active }) => (
                    <button
                      onClick={() => onEnvironmentChange(env)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        active ? 'bg-gray-50' : ''
                      } ${isSelected ? 'bg-primary-50' : ''}`}
                    >
                      {/* Icon */}
                      <span className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center text-base`}>
                        {ENV_ICONS[env.type] || '📦'}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">{env.name}</span>
                          {env.isProduction && (
                            <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                              PROD
                            </span>
                          )}
                        </div>
                        {env.branch && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            {env.branch}
                          </div>
                        )}
                      </div>

                      {/* Selected indicator */}
                      {isSelected && (
                        <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  )}
                </Menu.Item>
              );
            })}
          </div>

          {/* Create new environment */}
          <div className="border-t border-gray-100 p-2">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    active ? 'bg-primary-50' : ''
                  }`}
                >
                  <span className="w-8 h-8 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-primary-600">Create Environment</span>
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

// Mock environments for development
function getMockEnvironments(): Environment[] {
  return [
    {
      id: 'env-production',
      name: 'Production',
      slug: 'production',
      type: 'PRODUCTION',
      isProduction: true,
      isDefault: false,
      color: '#EF4444',
      branch: 'main',
    },
    {
      id: 'env-staging',
      name: 'Staging',
      slug: 'staging',
      type: 'STAGING',
      isProduction: false,
      isDefault: false,
      color: '#F59E0B',
      branch: 'staging',
    },
    {
      id: 'env-development',
      name: 'Development',
      slug: 'development',
      type: 'DEVELOPMENT',
      isProduction: false,
      isDefault: true,
      color: '#3B82F6',
      branch: 'develop',
    },
  ];
}

// Compact version for navbar
export function EnvironmentBadge({ environment }: { environment?: Environment }) {
  if (!environment) return null;

  const colors = ENV_COLORS[environment.type] || ENV_COLORS.DEVELOPMENT;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${colors.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      <span className={`text-xs font-medium ${colors.text}`}>
        {environment.name}
      </span>
    </div>
  );
}
