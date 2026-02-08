import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api.service';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Template {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  isOfficial: boolean;
}

const TEMPLATE_ICONS: Record<string, { emoji: string; color: string; bgColor: string }> = {
  postgresql: { emoji: '🐘', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  redis: { emoji: '⚡', color: 'text-red-700', bgColor: 'bg-red-100' },
  mongodb: { emoji: '🍃', color: 'text-green-700', bgColor: 'bg-green-100' },
  nodejs: { emoji: '🟢', color: 'text-lime-700', bgColor: 'bg-lime-100' },
  python: { emoji: '🐍', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  go: { emoji: '🐹', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  default: { emoji: '📦', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

const CATEGORY_LABELS: Record<string, string> = {
  database: '🗄️ Databases',
  cache: '⚡ Caching',
  backend: '🔧 Backend',
  frontend: '🎨 Frontend',
  devtools: '🛠️ Dev Tools',
};

export function TemplateMarketplace({ projectId }: { projectId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [deployInputs, setDeployInputs] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch available templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => apiService.getTemplates(),
    enabled: isOpen,
  });

  // Deploy template mutation
  const deployMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiService.deployTemplate(projectId, {
        templateId,
        inputs: deployInputs,
      });
    },
    onSuccess: () => {
      toast.success('Template deployment started! 🚀');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#16A34A', '#22C55E', '#4ADE80'],
      });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setIsOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deploy template');
    },
  });

  // Group templates by category
  const groupedTemplates = templates.reduce((acc: Record<string, Template[]>, template: Template) => {
    const category = template.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {});

  const getTemplateIcon = (template: Template) => {
    const slug = template.slug.toLowerCase();
    for (const key of Object.keys(TEMPLATE_ICONS)) {
      if (slug.includes(key)) return TEMPLATE_ICONS[key];
    }
    return TEMPLATE_ICONS.default;
  };

  const handleDeploy = () => {
    if (selectedTemplate) {
      deployMutation.mutate(selectedTemplate.id);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-success-500 text-white rounded-lg hover:from-primary-600 hover:to-success-600 transition-all shadow-md hover:shadow-lg"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span className="font-medium">One-Click Deploy</span>
      </button>

      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setIsOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 w-full max-w-3xl">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-primary-600 to-success-600 px-6 py-5">
                    <Dialog.Title as="h3" className="text-xl font-bold text-white flex items-center gap-2">
                      <span className="text-2xl">🚀</span>
                      Service Templates
                    </Dialog.Title>
                    <p className="text-primary-100 text-sm mt-1">
                      One-click deploy pre-configured services. All running on 100% green energy.
                    </p>
                  </div>

                  {selectedTemplate ? (
                    // Template detail view
                    <div className="p-6">
                      <button
                        onClick={() => setSelectedTemplate(null)}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to templates
                      </button>

                      <div className="flex items-start gap-4 mb-6">
                        <div className={`w-16 h-16 rounded-xl ${getTemplateIcon(selectedTemplate).bgColor} flex items-center justify-center text-3xl`}>
                          {selectedTemplate.icon || getTemplateIcon(selectedTemplate).emoji}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h3>
                          <p className="text-gray-500 mt-1">{selectedTemplate.description}</p>
                          {selectedTemplate.isOfficial && (
                            <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Official Template
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <h4 className="font-medium text-gray-900 mb-2">What you'll get:</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                          <li className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Pre-configured {selectedTemplate.name} instance
                          </li>
                          <li className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Persistent storage attached
                          </li>
                          <li className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Auto-generated secure credentials
                          </li>
                          <li className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Environment variables ready to reference
                          </li>
                        </ul>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setSelectedTemplate(null)}
                          className="flex-1 btn btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeploy}
                          disabled={deployMutation.isPending}
                          className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                        >
                          {deployMutation.isPending ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Deploying...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Deploy Now
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Template list view
                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                        </div>
                      ) : Object.keys(groupedTemplates).length === 0 ? (
                        <EmptyTemplates />
                      ) : (
                        Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                          <div key={category} className="mb-8 last:mb-0">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                              {CATEGORY_LABELS[category] || `📦 ${category}`}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {(categoryTemplates as Template[]).map((template) => {
                                const icon = getTemplateIcon(template);
                                return (
                                  <button
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template)}
                                    className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all text-left group"
                                  >
                                    <div className={`w-12 h-12 rounded-lg ${icon.bgColor} flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                      {template.icon || icon.emoji}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-gray-900">{template.name}</h4>
                                        {template.isOfficial && (
                                          <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                          </svg>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-500 truncate">{template.description}</p>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="text-primary-500">🌱</span>
                      All templates run on 100% renewable energy
                    </p>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}

function EmptyTemplates() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center text-3xl">
        📦
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates yet</h3>
      <p className="text-gray-500 text-sm">
        Templates are coming soon! For now, deploy services manually.
      </p>
    </div>
  );
}
