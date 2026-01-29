import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../services/api.service';
import { ServiceType, RepositoryProvider } from '@kubidu/shared';

export function NewService() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType | ''>('');

  // GitHub fields
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [repositoryProvider, setRepositoryProvider] = useState<RepositoryProvider>(RepositoryProvider.GITHUB);
  const [repositoryBranch, setRepositoryBranch] = useState('main');

  // Docker image fields
  const [dockerImage, setDockerImage] = useState('');
  const [dockerTag, setDockerTag] = useState('latest');

  // Default configuration
  const [defaultPort, setDefaultPort] = useState<number>(3000);
  const [defaultReplicas, setDefaultReplicas] = useState<number>(1);
  const [defaultCpuLimit, setDefaultCpuLimit] = useState('1000m');
  const [defaultMemoryLimit, setDefaultMemoryLimit] = useState('512Mi');
  const [defaultCpuRequest, setDefaultCpuRequest] = useState('100m');
  const [defaultMemoryRequest, setDefaultMemoryRequest] = useState('128Mi');
  const [defaultHealthCheckPath, setDefaultHealthCheckPath] = useState('/');
  const [autoDeploy, setAutoDeploy] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Service name is required');
      return;
    }

    if (!serviceType) {
      setError('Please select a service type');
      return;
    }

    if (serviceType === ServiceType.GITHUB && !repositoryUrl.trim()) {
      setError('Repository URL is required for GitHub services');
      return;
    }

    if (serviceType === ServiceType.DOCKER_IMAGE && !dockerImage.trim()) {
      setError('Docker image is required for Docker Image services');
      return;
    }

    try {
      setIsLoading(true);
      await apiService.createService(projectId!, {
        name: name.trim(),
        serviceType,
        repositoryUrl: serviceType === ServiceType.GITHUB ? repositoryUrl.trim() : undefined,
        repositoryProvider: serviceType === ServiceType.GITHUB ? repositoryProvider : undefined,
        repositoryBranch: serviceType === ServiceType.GITHUB ? repositoryBranch.trim() : undefined,
        dockerImage: serviceType === ServiceType.DOCKER_IMAGE ? dockerImage.trim() : undefined,
        dockerTag: serviceType === ServiceType.DOCKER_IMAGE ? dockerTag.trim() : undefined,
        defaultPort,
        defaultReplicas,
        defaultCpuLimit,
        defaultMemoryLimit,
        defaultCpuRequest,
        defaultMemoryRequest,
        defaultHealthCheckPath,
        autoDeploy,
      });

      navigate(`/projects/${projectId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create service');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="text-primary-600 hover:text-primary-700 mb-4 flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Project
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Add Service</h1>
        <p className="mt-2 text-gray-600">
          Add a new service to your project (frontend, backend, database, etc.)
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="e.g., Frontend, Backend, Database"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Type
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
                className="input"
                required
              >
                <option value="">Select a service type...</option>
                <option value={ServiceType.GITHUB}>GitHub Repository</option>
                <option value={ServiceType.DOCKER_IMAGE}>Docker Image</option>
              </select>
            </div>
          </div>
        </div>

        {serviceType === ServiceType.GITHUB && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">GitHub Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repository URL
                </label>
                <input
                  type="url"
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                  className="input"
                  placeholder="https://github.com/username/repo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider
                </label>
                <select
                  value={repositoryProvider}
                  onChange={(e) => setRepositoryProvider(e.target.value as RepositoryProvider)}
                  className="input"
                >
                  <option value={RepositoryProvider.GITHUB}>GitHub</option>
                  <option value={RepositoryProvider.GITLAB}>GitLab</option>
                  <option value={RepositoryProvider.BITBUCKET}>Bitbucket</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <input
                  type="text"
                  value={repositoryBranch}
                  onChange={(e) => setRepositoryBranch(e.target.value)}
                  className="input"
                  placeholder="main"
                />
              </div>
            </div>
          </div>
        )}

        {serviceType === ServiceType.DOCKER_IMAGE && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Docker Image Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Docker Image
                </label>
                <input
                  type="text"
                  value={dockerImage}
                  onChange={(e) => setDockerImage(e.target.value)}
                  className="input"
                  placeholder="e.g., postgres, nginx, redis"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag
                </label>
                <input
                  type="text"
                  value={dockerTag}
                  onChange={(e) => setDockerTag(e.target.value)}
                  className="input"
                  placeholder="latest"
                />
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Default Configuration</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={defaultPort}
                  onChange={(e) => setDefaultPort(parseInt(e.target.value))}
                  className="input"
                  min="1"
                  max="65535"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Replicas
                </label>
                <input
                  type="number"
                  value={defaultReplicas}
                  onChange={(e) => setDefaultReplicas(parseInt(e.target.value))}
                  className="input"
                  min="1"
                  max="10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPU Limit
                </label>
                <input
                  type="text"
                  value={defaultCpuLimit}
                  onChange={(e) => setDefaultCpuLimit(e.target.value)}
                  className="input"
                  placeholder="1000m"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Memory Limit
                </label>
                <input
                  type="text"
                  value={defaultMemoryLimit}
                  onChange={(e) => setDefaultMemoryLimit(e.target.value)}
                  className="input"
                  placeholder="512Mi"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPU Request
                </label>
                <input
                  type="text"
                  value={defaultCpuRequest}
                  onChange={(e) => setDefaultCpuRequest(e.target.value)}
                  className="input"
                  placeholder="100m"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Memory Request
                </label>
                <input
                  type="text"
                  value={defaultMemoryRequest}
                  onChange={(e) => setDefaultMemoryRequest(e.target.value)}
                  className="input"
                  placeholder="128Mi"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Health Check Path
              </label>
              <input
                type="text"
                value={defaultHealthCheckPath}
                onChange={(e) => setDefaultHealthCheckPath(e.target.value)}
                className="input"
                placeholder="/"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoDeploy"
                checked={autoDeploy}
                onChange={(e) => setAutoDeploy(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="autoDeploy" className="ml-2 block text-sm text-gray-700">
                Enable auto-deploy on push
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Service'}
          </button>
        </div>
      </form>
    </div>
  );
}
