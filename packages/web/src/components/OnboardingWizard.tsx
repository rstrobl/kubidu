import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Kubidu! 🌱',
    description: 'The green cloud platform for European businesses. Deploy with confidence, stay compliant.',
    icon: <WelcomeIcon />,
  },
  {
    id: 'project',
    title: 'Create Your First Project',
    description: 'Projects are containers for your services. Think of them as folders for related apps.',
    icon: <ProjectIcon />,
    action: 'Create Project',
  },
  {
    id: 'service',
    title: 'Add Your First Service',
    description: 'Connect a GitHub repo or deploy a Docker image. We handle the rest.',
    icon: <ServiceIcon />,
  },
  {
    id: 'deploy',
    title: 'Deploy & Go Live',
    description: 'One click to deploy. Get a URL instantly. Auto-HTTPS included.',
    icon: <DeployIcon />,
  },
];

// User-friendly templates first, then developer templates
const SAMPLE_TEMPLATES = [
  // Non-tech friendly templates
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'Start your blog in minutes',
    icon: '📝',
    color: 'bg-blue-100 text-blue-700',
    category: 'website',
  },
  {
    id: 'ghost',
    name: 'Ghost Blog',
    description: 'Modern blogging platform',
    icon: '👻',
    color: 'bg-purple-100 text-purple-700',
    category: 'website',
  },
  {
    id: 'static',
    name: 'Static Website',
    description: 'Simple HTML/CSS site',
    icon: '🌐',
    color: 'bg-green-100 text-green-700',
    category: 'website',
  },
  // Developer templates
  {
    id: 'nodejs',
    name: 'Node.js',
    description: 'Express.js starter',
    icon: '🟢',
    color: 'bg-green-100 text-green-700',
    category: 'developer',
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Flask API',
    icon: '🐍',
    color: 'bg-yellow-100 text-yellow-700',
    category: 'developer',
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Database',
    icon: '🐘',
    color: 'bg-blue-100 text-blue-700',
    category: 'developer',
  },
];

export function OnboardingWizard() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [userType, setUserType] = useState<'website' | 'developer' | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('kubidu_onboarding_complete');
    const isNewUser = localStorage.getItem('kubidu_is_new_user');

    if (isNewUser && !hasCompletedOnboarding) {
      // Delay to let the page load first
      setTimeout(() => setIsOpen(true), 500);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('kubidu_onboarding_complete', 'true');
    localStorage.removeItem('kubidu_is_new_user');
    
    // Save user preference for simple mode
    if (userType === 'website') {
      localStorage.setItem('kubidu_simple_mode', 'true');
    }
    
    setIsOpen(false);

    // Celebration!
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#16A34A', '#22C55E', '#4ADE80', '#86EFAC'],
    });

    // Navigate to create project
    if (selectedTemplate) {
      navigate(`/projects/new?template=${selectedTemplate}`);
    } else {
      navigate('/projects/new');
    }
  };

  const handleSkip = () => {
    localStorage.setItem('kubidu_onboarding_complete', 'true');
    localStorage.removeItem('kubidu_is_new_user');
    setIsOpen(false);
  };

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={() => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Progress bar */}
                <div className="h-1 bg-gray-100">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-success-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Content */}
                <div className="px-8 py-8">
                  {/* Step indicator */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    {ONBOARDING_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          i === currentStep
                            ? 'w-8 bg-primary-500'
                            : i < currentStep
                            ? 'bg-primary-300'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-success-100 rounded-2xl flex items-center justify-center animate-float">
                      {step.icon}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
                    {step.title}
                  </h2>
                  <p className="text-gray-500 text-center mb-8">
                    {step.description}
                  </p>

                  {/* User type selection on step 1 */}
                  {currentStep === 1 && !userType && (
                    <div className="mb-8">
                      <p className="text-sm font-medium text-gray-700 mb-4 text-center">
                        What best describes you?
                      </p>
                      <div className="grid grid-cols-1 gap-3">
                        <button
                          onClick={() => setUserType('website')}
                          className="p-4 rounded-xl border-2 border-gray-100 hover:border-primary-300 hover:bg-primary-50 text-left transition-all flex items-center gap-4"
                        >
                          <span className="text-4xl">🌐</span>
                          <div>
                            <span className="font-semibold text-gray-900 block">I want a website</span>
                            <span className="text-sm text-gray-500">Blog, portfolio, business site, or online store</span>
                          </div>
                        </button>
                        <button
                          onClick={() => setUserType('developer')}
                          className="p-4 rounded-xl border-2 border-gray-100 hover:border-primary-300 hover:bg-primary-50 text-left transition-all flex items-center gap-4"
                        >
                          <span className="text-4xl">💻</span>
                          <div>
                            <span className="font-semibold text-gray-900 block">I'm a developer</span>
                            <span className="text-sm text-gray-500">Deploy Docker apps, APIs, databases</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Template selection on step 1 (after user type is selected) */}
                  {currentStep === 1 && userType && (
                    <div className="mb-8">
                      <p className="text-sm font-medium text-gray-700 mb-3 text-center">
                        {userType === 'website' ? 'Pick a template to get started' : 'Start with a template (optional)'}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {SAMPLE_TEMPLATES
                          .filter(t => t.category === userType || !userType)
                          .slice(0, 4)
                          .map((template) => (
                          <button
                            key={template.id}
                            onClick={() => setSelectedTemplate(
                              selectedTemplate === template.id ? null : template.id
                            )}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${
                              selectedTemplate === template.id
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-lg px-2 py-1 rounded-lg ${template.color}`}>
                                {template.icon}
                              </span>
                              <span className="font-medium text-sm text-gray-900">{template.name}</span>
                            </div>
                            <p className="text-xs text-gray-500">{template.description}</p>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setUserType(null)}
                        className="mt-3 text-xs text-gray-400 hover:text-gray-600 mx-auto block"
                      >
                        ← Change selection
                      </button>
                    </div>
                  )}

                  {/* Features highlight on welcome step */}
                  {currentStep === 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <FeatureHighlight icon="🌱" label="100% Green" />
                      <FeatureHighlight icon="🇪🇺" label="EU Hosted" />
                      <FeatureHighlight icon="🔒" label="GDPR Ready" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleSkip}
                      className="flex-1 py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Skip for now
                    </button>
                    <button
                      onClick={handleNext}
                      className="flex-1 btn btn-primary py-3"
                    >
                      {currentStep === ONBOARDING_STEPS.length - 1 ? "Let's Go! 🚀" : 'Continue'}
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-400 text-center">
                    Step {currentStep + 1} of {ONBOARDING_STEPS.length} • Press Enter to continue
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

function FeatureHighlight({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-xl">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs font-medium text-gray-600">{label}</div>
    </div>
  );
}

// Icons
function WelcomeIcon() {
  return <span className="text-4xl">👋</span>;
}

function ProjectIcon() {
  return (
    <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function ServiceIcon() {
  return (
    <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  );
}

function DeployIcon() {
  return (
    <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  );
}

// Trigger function to show onboarding for new users
export function markAsNewUser() {
  localStorage.setItem('kubidu_is_new_user', 'true');
  localStorage.removeItem('kubidu_onboarding_complete');
}

// Reset onboarding (for testing)
export function resetOnboarding() {
  localStorage.removeItem('kubidu_onboarding_complete');
  localStorage.setItem('kubidu_is_new_user', 'true');
}
