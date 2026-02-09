import { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api.service';
import { GitHubRepoPicker } from './GitHubRepoPicker';
import { Template } from '@kubidu/shared';
import { TemplateDeployModal } from './TemplateDeployModal';

interface AddServiceModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface GitHubSelection {
  repoFullName: string;
  repoName: string;
  repositoryUrl: string;
  branch: string;
  installationId: string;
}

// Database templates to highlight
const DATABASE_CATEGORIES = ['database', 'cache'];
const DATABASE_SLUGS = ['postgresql', 'mysql', 'redis', 'mongodb', 'mariadb'];

export function AddServiceModal({ projectId, isOpen, onClose, onSuccess }: AddServiceModalProps) {
  const [serviceType, setServiceType] = useState<'GITHUB' | 'DOCKER_IMAGE' | 'TEMPLATE' | 'DATABASE'>('GITHUB');
  const [dockerImage, setDockerImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  // Template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Load templates on mount
  useEffect(() => {
    if (isOpen && templates.length === 0) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const data = await apiService.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Split templates into databases and other apps
  const databaseTemplates = templates.filter(t => 
    DATABASE_CATEGORIES.includes(t.category || '') || DATABASE_SLUGS.includes(t.slug)
  );
  const appTemplates = templates.filter(t => 
    !DATABASE_CATEGORIES.includes(t.category || '') && !DATABASE_SLUGS.includes(t.slug)
  );

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setServiceType('GITHUB');
      setDockerImage('');
      setError('');
      submittingRef.current = false;
      setSelectedTemplate(null);
    }
  }, [isOpen]);

  const submitService = async (data: {
    name: string;
    serviceType: string;
    repositoryUrl?: string;
    repositoryProvider?: string;
    repositoryBranch?: string;
    githubInstallationId?: string;
    githubRepoFullName?: string;
    dockerImage?: string;
    dockerTag?: string;
  }) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    setIsSubmitting(true);

    try {
      await apiService.createService(projectId, data as any);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create service');
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleGitHubSelect = (selection: GitHubSelection) => {
    submitService({
      name: selection.repoName,
      serviceType: 'GITHUB',
      repositoryUrl: selection.repositoryUrl,
      repositoryProvider: 'github',
      repositoryBranch: selection.branch,
      githubInstallationId: selection.installationId,
      githubRepoFullName: selection.repoFullName,
    });
  };

  const handleDockerSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!dockerImage) {
      setError('Docker image is required');
      return;
    }

    // Parse image and tag from input (e.g., "prefecthq/prefect:3-python3.13")
    const lastSegment = dockerImage.split('/').pop() || dockerImage;
    const colonIndex = lastSegment.indexOf(':');
    const name = colonIndex >= 0 ? lastSegment.substring(0, colonIndex) : lastSegment;
    if (!name) {
      setError('Could not generate service name from the provided information');
      return;
    }

    // Split image reference into image and tag
    const imageColonIndex = dockerImage.lastIndexOf(':');
    const hasTag = imageColonIndex > dockerImage.lastIndexOf('/');
    const image = hasTag ? dockerImage.substring(0, imageColonIndex) : dockerImage;
    const tag = hasTag ? dockerImage.substring(imageColonIndex + 1) : 'latest';

    await submitService({
      name,
      serviceType: 'DOCKER_IMAGE',
      dockerImage: image,
      dockerTag: tag,
    });
  };

  const generateDockerName = (): string => {
    if (dockerImage) {
      const imageWithoutRegistry = dockerImage.split('/').pop() || dockerImage;
      return imageWithoutRegistry.split(':')[0];
    }
    return '';
  };

  const renderTemplateIcon = (template: Template) => {
    const icon = template.icon;
    // Check if icon is a URL
    if (icon && (icon.startsWith('http://') || icon.startsWith('https://'))) {
      return <img src={icon} alt={template.name} className="w-8 h-8" />;
    }
    // Fallback to emoji or default
    if (icon) {
      return <span className="text-2xl">{icon}</span>;
    }
    // Default icons by category
    const defaultIcons: Record<string, string> = {
      database: '🗄️',
      cms: '📝',
      cache: '⚡',
      messaging: '📨',
      monitoring: '📊',
      automation: '🔄',
    };
    return <span className="text-2xl">{defaultIcons[template.category || ''] || '📦'}</span>;
  };

  const renderTemplateList = (templateList: Template[], emptyMessage: string) => {
    if (loadingTemplates) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading...</p>
        </div>
      );
    }

    if (templateList.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-3">
        {templateList.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => setSelectedTemplate(template)}
            className="p-4 border-2 rounded-lg text-left transition-colors border-gray-200 hover:border-primary-300 hover:bg-primary-50 group"
          >
            <div className="flex items-center">
              <span className="mr-3 flex items-center justify-center w-10 h-10">{renderTemplateIcon(template)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 group-hover:text-primary-700 truncate">{template.name}</span>
                  {template.isOfficial && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded flex-shrink-0">Official</span>
                  )}
                </div>
                {template.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{template.description}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Service</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Service Type Selection - 2x2 grid for better prominence */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What do you want to deploy?
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setServiceType('DATABASE')}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    serviceType === 'DATABASE'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center mr-3">
                      <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4s-8-1.79-8-4zm0 5v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Database</div>
                      <div className="text-xs text-gray-500">PostgreSQL, MySQL, Redis, MongoDB</div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setServiceType('TEMPLATE')}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    serviceType === 'TEMPLATE'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mr-3">
                      <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Template</div>
                      <div className="text-xs text-gray-500">Ghost, n8n, Uptime Kuma & more</div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setServiceType('GITHUB')}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    serviceType === 'GITHUB'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                      <svg className="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">GitHub Repository</div>
                      <div className="text-xs text-gray-500">Auto-build & deploy on push</div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setServiceType('DOCKER_IMAGE')}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    serviceType === 'DOCKER_IMAGE'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                      <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H5.136a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Docker Image</div>
                      <div className="text-xs text-gray-500">Any public or private image</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Database Selection */}
            {serviceType === 'DATABASE' && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Select a Database</h3>
                {renderTemplateList(databaseTemplates, 'No database templates available yet.')}
              </div>
            )}

            {/* Template Selection (non-database) */}
            {serviceType === 'TEMPLATE' && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Select a Template</h3>
                {renderTemplateList(appTemplates, 'No templates available yet.')}
              </div>
            )}

            {/* GitHub Configuration */}
            {serviceType === 'GITHUB' && (
              <GitHubRepoPicker
                onSelect={(repo, installation, branch) => {
                  handleGitHubSelect({
                    repoFullName: repo.fullName,
                    repoName: repo.name,
                    repositoryUrl: `https://github.com/${repo.fullName}`,
                    branch,
                    installationId: installation.id,
                  });
                }}
              />
            )}

            {/* Docker Image Configuration */}
            {serviceType === 'DOCKER_IMAGE' && (
              <div>
                {/* Popular Images Quick Pick */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Start
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'ghost:5-alpine', icon: 'https://ghost.org/favicon.ico', label: 'Ghost Blog' },
                      { name: 'postgres:16', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg', label: 'PostgreSQL' },
                      { name: 'n8nio/n8n', icon: 'https://n8n.io/favicon.ico', label: 'n8n Automation' },
                      { name: 'louislam/uptime-kuma', icon: 'https://raw.githubusercontent.com/louislam/uptime-kuma/master/public/icon.svg', label: 'Uptime Kuma' },
                      { name: 'redis:7', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg', label: 'Redis' },
                    ].map((img) => (
                      <button
                        key={img.name}
                        type="button"
                        onClick={() => setDockerImage(img.name)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-1.5 ${
                          dockerImage === img.name
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <img src={img.icon} alt={img.label} className="w-4 h-4" />
                        <span>{img.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-400">or enter custom image</span>
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="dockerImage" className="block text-sm font-medium text-gray-700 mb-1">
                    Docker Image *
                  </label>
                  <input
                    type="text"
                    id="dockerImage"
                    value={dockerImage}
                    onChange={(e) => setDockerImage(e.target.value)}
                    placeholder="postgres:14 or registry.com/image:tag"
                    className="input"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    The Docker image to deploy (e.g., postgres:14, nginx:latest)
                  </p>
                </div>
              </div>
            )}

            {/* Template Deploy Modal */}
            {selectedTemplate && (
              <TemplateDeployModal
                projectId={projectId}
                template={selectedTemplate}
                isOpen={true}
                onClose={() => setSelectedTemplate(null)}
                onSuccess={() => {
                  setSelectedTemplate(null);
                  onSuccess();
                  onClose();
                }}
              />
            )}

            {/* Generated Name Preview (Docker only — GitHub submits immediately) */}
            {serviceType === 'DOCKER_IMAGE' && generateDockerName() && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <div className="text-sm font-medium text-blue-900">Service Name (auto-generated)</div>
                <div className="mt-1 font-mono text-blue-700">{generateDockerName()}</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            {serviceType === 'DOCKER_IMAGE' && (
              <button
                onClick={handleDockerSubmit}
                className="btn btn-primary"
                disabled={isSubmitting || !generateDockerName()}
              >
                {isSubmitting ? 'Creating...' : 'Create Service'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
