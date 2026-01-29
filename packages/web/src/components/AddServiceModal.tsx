import { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api.service';
import { GitHubRepoPicker } from './GitHubRepoPicker';

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

export function AddServiceModal({ projectId, isOpen, onClose, onSuccess }: AddServiceModalProps) {
  const [serviceType, setServiceType] = useState<'GITHUB' | 'DOCKER_IMAGE'>('GITHUB');
  const [dockerImage, setDockerImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

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
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Add Service</h2>
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
          <div className="px-6 py-4">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Service Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setServiceType('GITHUB')}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    serviceType === 'GITHUB'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">GitHub Repository</div>
                  <div className="text-sm text-gray-500 mt-1">Deploy from a Git repo</div>
                </button>
                <button
                  type="button"
                  onClick={() => setServiceType('DOCKER_IMAGE')}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    serviceType === 'DOCKER_IMAGE'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">Docker Image</div>
                  <div className="text-sm text-gray-500 mt-1">Deploy a pre-built image</div>
                </button>
              </div>
            </div>

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
