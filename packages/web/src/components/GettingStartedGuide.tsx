import { useState } from 'react';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  completed?: boolean;
}

interface GettingStartedGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onStepAction?: (stepId: string) => void;
  completedSteps?: string[];
}

export function GettingStartedGuide({
  isOpen,
  onClose,
  onStepAction,
  completedSteps = [],
}: GettingStartedGuideProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>('create-project');

  const steps: Step[] = [
    {
      id: 'create-project',
      title: 'Create your first project',
      description: 'A project is a container for your services. Think of it as an application or microservice group.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      action: {
        label: 'Create Project',
        href: '/projects/new',
      },
      completed: completedSteps.includes('create-project'),
    },
    {
      id: 'add-service',
      title: 'Add a service',
      description: 'Connect a GitHub repository or deploy a Docker image. Services are the building blocks of your project.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      completed: completedSteps.includes('add-service'),
    },
    {
      id: 'configure-env',
      title: 'Configure environment variables',
      description: 'Add secrets and configuration. Variables can be shared between services or kept private.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      completed: completedSteps.includes('configure-env'),
    },
    {
      id: 'deploy',
      title: 'Deploy your service',
      description: 'Click deploy to build and run your service. Kubidu handles containers, networking, and scaling.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      completed: completedSteps.includes('deploy'),
    },
    {
      id: 'custom-domain',
      title: 'Add a custom domain',
      description: 'Connect your own domain with automatic SSL. Or use the free *.kubidu.io subdomain.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      completed: completedSteps.includes('custom-domain'),
    },
    {
      id: 'invite-team',
      title: 'Invite your team',
      description: 'Add team members to your workspace. Assign roles like Admin, Developer, or Viewer.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      completed: completedSteps.includes('invite-team'),
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Getting Started
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {completedCount} of {steps.length} steps completed
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-150px)]">
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`border rounded-lg transition-all ${
                  expandedStep === step.id
                    ? 'border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <button
                  onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  {/* Step indicator */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.completed
                        ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step.completed ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${
                      step.completed
                        ? 'text-gray-500 dark:text-gray-400 line-through'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {step.title}
                    </p>
                  </div>

                  {/* Expand arrow */}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      expandedStep === step.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded content */}
                {expandedStep === step.id && (
                  <div className="px-4 pb-4 pt-0">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 ml-11">
                      {step.description}
                    </p>
                    {step.action && !step.completed && (
                      <div className="ml-11">
                        {step.action.href ? (
                          <a
                            href={step.action.href}
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              onStepAction?.(step.id);
                              onClose();
                            }}
                          >
                            {step.action.label}
                          </a>
                        ) : (
                          <button
                            onClick={() => {
                              step.action?.onClick?.();
                              onStepAction?.(step.id);
                            }}
                            className="btn btn-primary btn-sm"
                          >
                            {step.action.label}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <a
              href="https://docs.kubidu.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              View full documentation →
            </a>
            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
