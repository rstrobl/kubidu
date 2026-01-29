import { useState, useEffect } from 'react';
import { apiService } from '../services/api.service';
import { ServiceStatus } from '@kubidu/shared';

interface ServiceDetailModalProps {
  projectId: string;
  serviceId: string;
  isOpen: boolean;
  onClose: () => void;
  onServiceUpdated?: () => void;
  initialTab?: 'overview' | 'settings' | 'env' | 'domains' | 'deployments';
  onTabChange?: (tab: string) => void;
}

// Helper function to format relative time
function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }

  // For older items, show the date
  return past.toLocaleDateString();
}

export function ServiceDetailModal({ projectId, serviceId, isOpen, onClose, onServiceUpdated, initialTab, onTabChange }: ServiceDetailModalProps) {
  const [service, setService] = useState<any>(null);
  const [envVars, setEnvVars] = useState<any[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDeploymentLogs, setSelectedDeploymentLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [buildLogs, setBuildLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [logType, setLogType] = useState<'runtime' | 'build'>('runtime');
  const [lastLogLength, setLastLogLength] = useState<number>(0);
  const [lastBuildLogLength, setLastBuildLogLength] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryingDeployment, setRetryingDeployment] = useState<string | null>(null);
  const [activeTab, setActiveTabState] = useState<'overview' | 'settings' | 'env' | 'domains' | 'deployments'>(initialTab || 'overview');
  const setActiveTab = (tab: 'overview' | 'settings' | 'env' | 'domains' | 'deployments') => {
    setActiveTabState(tab);
    onTabChange?.(tab);
  };

  // Environment variable form state
  const [showEnvForm, setShowEnvForm] = useState(false);
  const [envKey, setEnvKey] = useState('');
  const [envValue, setEnvValue] = useState('');
  const [envIsSecret, setEnvIsSecret] = useState(false);
  const [envLoading, setEnvLoading] = useState(false);
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);
  const [editEnvValue, setEditEnvValue] = useState('');
  const [editEnvIsSecret, setEditEnvIsSecret] = useState(false);
  const [rawEditMode, setRawEditMode] = useState(false);
  const [rawEnvText, setRawEnvText] = useState('');
  const [copiedEnvId, setCopiedEnvId] = useState<string | null>(null);

  // Service edit state
  const [editedService, setEditedService] = useState<any>({});

  // Domain state
  const [showDomainForm, setShowDomainForm] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [domainLoading, setDomainLoading] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);

  // Subdomain state
  const [editingSubdomain, setEditingSubdomain] = useState(false);
  const [subdomainInput, setSubdomainInput] = useState('');
  const [subdomainLoading, setSubdomainLoading] = useState(false);
  const [copiedSubdomain, setCopiedSubdomain] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTabState('overview');
      setSelectedDeploymentLogs(null);
      setShowEnvForm(false);
      setShowDomainForm(false);
      setEditingSubdomain(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && projectId && serviceId) {
      loadService();
      loadEnvVars();
      loadDeployments();
      loadDomains();
    }
  }, [isOpen, projectId, serviceId]);

  // Poll for deployment status updates when on deployments tab
  useEffect(() => {
    if (isOpen && activeTab === 'deployments') {
      const interval = setInterval(() => {
        loadDeployments();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isOpen, activeTab, serviceId]);

  // Poll for logs when viewing logs
  useEffect(() => {
    if (isOpen && selectedDeploymentLogs) {
      const interval = setInterval(() => {
        loadLogs(selectedDeploymentLogs, logType, true);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isOpen, selectedDeploymentLogs, logType]);

  // Update relative times every minute
  const [, setTimeUpdateTrigger] = useState(0);
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setTimeUpdateTrigger(prev => prev + 1);
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadService = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getService(projectId, serviceId);
      setService(data);
      setEditedService(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load service');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEnvVars = async () => {
    try {
      const data = await apiService.getEnvironmentVariables(serviceId, undefined, true);
      setEnvVars(data);
    } catch (err: any) {
      console.error('Failed to load environment variables', err);
    }
  };

  const loadDeployments = async () => {
    try {
      const data = await apiService.getDeployments(serviceId);
      setDeployments(data);
    } catch (err: any) {
      console.error('Failed to load deployments', err);
    }
  };

  const loadDomains = async () => {
    try {
      const data = await apiService.getDomains(serviceId);
      setDomains(data);
    } catch (err: any) {
      console.error('Failed to load domains', err);
    }
  };

  const loadLogs = async (deploymentId: string, type: 'runtime' | 'build' = 'runtime', isPolling: boolean = false) => {
    try {
      if (!isPolling) {
        setLogsLoading(true);
      }
      if (type === 'runtime') {
        const data = await apiService.getDeploymentLogs(deploymentId);
        const newLogs = data.logs || '';
        if (!isPolling || newLogs.length > lastLogLength) {
          setLogs(newLogs);
          setLastLogLength(newLogs.length);
        }
      } else {
        const data = await apiService.getDeploymentBuildLogs(deploymentId);
        const newBuildLogs = data.logs || '';
        if (!isPolling || newBuildLogs.length > lastBuildLogLength) {
          setBuildLogs(newBuildLogs);
          setLastBuildLogLength(newBuildLogs.length);
        }
      }
    } catch (err: any) {
      console.error('Failed to load logs', err);
    } finally {
      if (!isPolling) {
        setLogsLoading(false);
      }
    }
  };

  const handleRetryDeployment = async (deploymentId: string) => {
    try {
      setRetryingDeployment(deploymentId);
      await apiService.retryDeployment(deploymentId);
      await loadDeployments();
    } catch (err: any) {
      console.error('Failed to retry deployment', err);
    } finally {
      setRetryingDeployment(null);
    }
  };

  const handleAddEnvVar = async () => {
    if (!envKey.trim() || !envValue.trim()) {
      return;
    }

    try {
      setEnvLoading(true);
      await apiService.createEnvironmentVariable({
        key: envKey.trim(),
        value: envValue.trim(),
        isSecret: envIsSecret,
        serviceId: serviceId,
      });

      setEnvKey('');
      setEnvValue('');
      setEnvIsSecret(false);
      setShowEnvForm(false);
      await loadEnvVars();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add environment variable');
    } finally {
      setEnvLoading(false);
    }
  };

  const handleUpdateService = async () => {
    try {
      setIsLoading(true);
      await apiService.updateService(projectId, serviceId, {
        name: editedService.name,
        repositoryBranch: editedService.repositoryBranch,
        dockerTag: editedService.dockerTag,
        defaultPort: editedService.defaultPort,
        defaultStartCommand: editedService.defaultStartCommand || null,
      });
      await loadService();
      setError('');
      if (onServiceUpdated) onServiceUpdated();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteService = async () => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.deleteService(projectId, serviceId);
      if (onServiceUpdated) onServiceUpdated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete service');
    }
  };

  const handleEditEnvVar = async (envVar: any) => {
    setEditingEnvId(envVar.id);
    setEditEnvIsSecret(envVar.isSecret || false);

    // Fetch decrypted value
    try {
      const decryptedVars = await apiService.getEnvironmentVariables(serviceId, undefined, true);
      const decryptedVar = decryptedVars.find((v: any) => v.id === envVar.id);
      if (decryptedVar && decryptedVar.value) {
        setEditEnvValue(decryptedVar.value);
      } else {
        setEditEnvValue('');
      }
    } catch (err) {
      console.error('Failed to decrypt environment variable:', err);
      setEditEnvValue('');
    }
  };

  const handleSaveEnvVar = async (envVar: any) => {
    if (!editEnvValue.trim()) {
      setError('Value cannot be empty');
      return;
    }

    try {
      setEnvLoading(true);
      await apiService.createEnvironmentVariable({
        key: envVar.key,
        value: editEnvValue.trim(),
        isSecret: editEnvIsSecret,
        serviceId: serviceId,
      });

      setEditingEnvId(null);
      setEditEnvValue('');
      setEditEnvIsSecret(false);
      await loadEnvVars();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update environment variable');
    } finally {
      setEnvLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingEnvId(null);
    setEditEnvValue('');
    setEditEnvIsSecret(false);
  };

  const handleDeleteEnvVar = async (varId: string) => {
    if (!confirm('Are you sure you want to delete this environment variable?')) {
      return;
    }

    try {
      await apiService.deleteEnvironmentVariable(varId);
      await loadEnvVars();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete environment variable');
    }
  };

  const handleToggleRawEdit = async () => {
    if (!rawEditMode) {
      try {
        // Fetch decrypted values, exclude system variables
        const decryptedVars = await apiService.getEnvironmentVariables(serviceId, undefined, true);
        const userVars = decryptedVars.filter((v: any) => !v.isSystem);
        // Convert env vars to raw text format with actual values
        const text = userVars.map((v: any) => `${v.key}=${v.value || ''}`).join('\n');
        setRawEnvText(text);
      } catch (err) {
        console.error('Failed to decrypt environment variables:', err);
        // Fallback to keys only, exclude system variables
        const userVars = envVars.filter((v: any) => !v.isSystem);
        const text = userVars.map((v: any) => `${v.key}=`).join('\n');
        setRawEnvText(text);
      }
    }
    setRawEditMode(!rawEditMode);
  };

  const handleCopyEnvValue = async (envVar: any) => {
    try {
      await navigator.clipboard.writeText(envVar.value || '');
      setCopiedEnvId(envVar.id);
      setTimeout(() => setCopiedEnvId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSaveRawEnv = async () => {
    try {
      setEnvLoading(true);
      const lines = rawEnvText.split('\n').filter((line: string) => line.trim());

      for (const line of lines) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=');

        if (key.trim() && value.trim()) {
          await apiService.createEnvironmentVariable({
            key: key.trim(),
            value: value.trim(),
            isSecret: false,
            serviceId: serviceId,
          });
        }
      }

      setRawEditMode(false);
      setRawEnvText('');
      await loadEnvVars();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save environment variables');
    } finally {
      setEnvLoading(false);
    }
  };

  const handleAddDomain = async (e: any) => {
    e.preventDefault();
    if (!domainInput.trim()) {
      setError('Domain cannot be empty');
      return;
    }

    try {
      setDomainLoading(true);
      await apiService.createDomain(serviceId, domainInput.trim());
      setShowDomainForm(false);
      setDomainInput('');
      await loadDomains();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add domain');
    } finally {
      setDomainLoading(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      setVerifyingDomain(domainId);
      await apiService.verifyDomain(serviceId, domainId);
      await loadDomains();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Domain verification failed');
    } finally {
      setVerifyingDomain(null);
    }
  };

  const handleCopySubdomain = async () => {
    const fullUrl = `${service.subdomain}.127.0.0.1.nip.io`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedSubdomain(true);
      setTimeout(() => setCopiedSubdomain(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) {
      return;
    }

    try {
      await apiService.deleteDomain(serviceId, domainId);
      await loadDomains();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete domain');
    }
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
      <div className="flex min-h-full items-start justify-center p-4 pt-20">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">
                {service?.name || 'Service Detail'}
              </h2>
              {service && (
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  service.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  service.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {service.status}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 px-6 bg-white">
            <nav className="-mb-px flex space-x-8">
              {(['overview', 'deployments', 'env', 'domains', 'settings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Content - scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">Loading...</div>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                    {error}
                  </div>
                )}
                {/* Overview Tab */}
                {activeTab === 'overview' && service && (
                  <div className="space-y-6">
                    {/* Public URL - Prominently displayed */}
                    {service.url && (
                      <div className="card bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-600 mb-1">Public URL</label>
                            <a
                              href={service.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-lg font-mono font-semibold text-primary-600 hover:text-primary-700 hover:underline break-all"
                            >
                              {service.url}
                            </a>
                            <p className="text-xs text-gray-600 mt-1">
                              This URL always points to your currently active deployment
                            </p>
                          </div>
                          <a
                            href={service.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-4 btn btn-primary"
                          >
                            Visit Site →
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="card">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Information</h2>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Name</label>
                          <p className="mt-1 text-sm text-gray-900">{service.name}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-500">Type</label>
                          <p className="mt-1 text-sm text-gray-900">{service.serviceType}</p>
                        </div>

                        {service.repositoryUrl && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">Repository</label>
                              <p className="mt-1 text-sm text-gray-900 truncate">{service.repositoryUrl}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">Branch</label>
                              <p className="mt-1 text-sm text-gray-900">{service.repositoryBranch || 'main'}</p>
                            </div>
                          </>
                        )}

                        {service.dockerImage && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">Docker Image</label>
                              <p className="mt-1 text-sm text-gray-900">{service.dockerImage}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">Tag</label>
                              <p className="mt-1 text-sm text-gray-900">{service.dockerTag || 'latest'}</p>
                            </div>
                          </>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-500">Default Port</label>
                          <p className="mt-1 text-sm text-gray-900">{service.defaultPort}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-500">Default Replicas</label>
                          <p className="mt-1 text-sm text-gray-900">{service.defaultReplicas}</p>
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Resource Limits</h2>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">CPU Limit</label>
                          <p className="mt-1 text-sm text-gray-900">{service.defaultCpuLimit}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-500">Memory Limit</label>
                          <p className="mt-1 text-sm text-gray-900">{service.defaultMemoryLimit}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-500">CPU Request</label>
                          <p className="mt-1 text-sm text-gray-900">{service.defaultCpuRequest}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-500">Memory Request</label>
                          <p className="mt-1 text-sm text-gray-900">{service.defaultMemoryRequest}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-500">Health Check Path</label>
                          <p className="mt-1 text-sm text-gray-900">{service.defaultHealthCheckPath}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Deployments Tab */}
                {activeTab === 'deployments' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-900">Deployments</h3>
                    </div>
                    {deployments.length === 0 ? (
                      <p className="text-sm text-gray-500">No deployments yet</p>
                    ) : (
                      <div className="space-y-4">
                        {deployments.map((deployment) => {
                          // Determine what to display as the deployment identifier
                          let deploymentLabel = '';
                          if (deployment.imageUrl) {
                            // For docker deployments, show image:tag
                            deploymentLabel = deployment.imageTag
                              ? `${deployment.imageUrl}:${deployment.imageTag}`
                              : deployment.imageUrl;
                          } else if (deployment.gitCommitSha) {
                            // For git deployments, show commit hash (short form)
                            deploymentLabel = `${deployment.gitCommitSha.substring(0, 7)}`;
                            if (deployment.gitCommitMessage) {
                              deploymentLabel += ` - ${deployment.gitCommitMessage}`;
                            }
                          } else {
                            // Fallback to deployment name
                            deploymentLabel = deployment.name;
                          }

                          return (
                            <div key={deployment.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex-1 min-w-0 mr-4">
                                  <h4 className="text-sm font-medium text-gray-900 truncate">{deploymentLabel}</h4>
                                  <p className="text-sm text-gray-500">
                                    {formatRelativeTime(deployment.createdAt)}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {deployment.isActive && (
                                    <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                                      Active
                                    </span>
                                  )}
                                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                                    deployment.status === 'RUNNING' ? 'bg-green-100 text-green-800' :
                                    deployment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                    deployment.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {deployment.status}
                                  </span>
                                </div>
                              </div>
                            <div className="flex space-x-2 mt-3">
                              {deployment.status === 'FAILED' && (
                                <button
                                  onClick={() => handleRetryDeployment(deployment.id)}
                                  className="btn bg-orange-600 hover:bg-orange-700 text-white text-sm"
                                  disabled={retryingDeployment === deployment.id}
                                >
                                  {retryingDeployment === deployment.id ? 'Retrying...' : 'Retry'}
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  const isBuildPhase = ['PENDING', 'BUILDING'].includes(deployment.status);
                                  const defaultType = isBuildPhase ? 'build' : 'runtime';
                                  setSelectedDeploymentLogs(deployment.id);
                                  setLogType(defaultType);
                                  loadLogs(deployment.id, defaultType);
                                }}
                                className="btn btn-secondary text-sm"
                                disabled={deployment.status === 'PENDING' || (selectedDeploymentLogs === deployment.id && logsLoading)}
                                title={deployment.status === 'PENDING' ? 'No logs available while deployment is pending' : ''}
                              >
                                {selectedDeploymentLogs === deployment.id && logsLoading
                                  ? 'Loading...'
                                  : 'View Logs'}
                              </button>
                            </div>

                            {/* Logs */}
                            {selectedDeploymentLogs === deployment.id && (
                              <div className="mt-4">
                                <div className="flex space-x-2 mb-2">
                                  {!['PENDING', 'BUILDING'].includes(deployment.status) && (
                                    <button
                                      onClick={() => {
                                        setLogType('runtime');
                                        loadLogs(deployment.id, 'runtime');
                                      }}
                                      className={`px-3 py-1 text-sm rounded ${
                                        logType === 'runtime'
                                          ? 'bg-primary-600 text-white'
                                          : 'bg-gray-200 text-gray-700'
                                      }`}
                                    >
                                      Runtime Logs
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setLogType('build');
                                      loadLogs(deployment.id, 'build');
                                    }}
                                    className={`px-3 py-1 text-sm rounded ${
                                      logType === 'build'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-200 text-gray-700'
                                    }`}
                                  >
                                    Build Logs
                                  </button>
                                </div>
                                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono">
                                  {logType === 'runtime' ? (logs || 'No runtime logs available') : (buildLogs || 'No build logs available')}
                                </pre>
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Environment Variables Tab */}
                {activeTab === 'env' && (
                  <div className="space-y-6">
                    <div className="card">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Environment Variables</h2>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleToggleRawEdit}
                            className="btn btn-secondary"
                          >
                            {rawEditMode ? 'Cancel' : 'Batch Edit'}
                          </button>
                          <button
                            onClick={() => setShowEnvForm(!showEnvForm)}
                            className="btn btn-primary"
                          >
                            {showEnvForm ? 'Cancel' : 'Add Variable'}
                          </button>
                        </div>
                      </div>

                      {rawEditMode && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 mb-2">
                            Edit environment variables in KEY=VALUE format (one per line). This will update or create variables.
                          </p>
                          <textarea
                            value={rawEnvText}
                            onChange={(e: any) => setRawEnvText(e.target.value)}
                            className="input font-mono text-sm"
                            rows={10}
                            placeholder="DATABASE_URL=postgres://...&#10;API_KEY=abc123&#10;PORT=3000"
                          />
                          <div className="flex justify-end space-x-3 mt-4">
                            <button
                              type="button"
                              onClick={handleToggleRawEdit}
                              className="btn btn-secondary"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveRawEnv}
                              className="btn btn-primary"
                              disabled={envLoading}
                            >
                              {envLoading ? 'Saving...' : 'Save All'}
                            </button>
                          </div>
                        </div>
                      )}

                      {showEnvForm && !rawEditMode && (
                        <form onSubmit={(e) => { e.preventDefault(); handleAddEnvVar(); }} className="mb-6 p-4 bg-gray-50 rounded-lg">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Key
                              </label>
                              <input
                                type="text"
                                value={envKey}
                                onChange={(e) => setEnvKey(e.target.value)}
                                className="input"
                                placeholder="e.g., DATABASE_URL"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Value
                              </label>
                              <input
                                type={envIsSecret ? 'password' : 'text'}
                                value={envValue}
                                onChange={(e) => setEnvValue(e.target.value)}
                                className="input"
                                placeholder="Value"
                                required
                              />
                            </div>

                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="isSecret"
                                checked={envIsSecret}
                                onChange={(e) => setEnvIsSecret(e.target.checked)}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <label htmlFor="isSecret" className="ml-2 block text-sm text-gray-700">
                                Mark as secret (hidden in UI)
                              </label>
                            </div>

                            <div className="flex justify-end space-x-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowEnvForm(false);
                                  setEnvKey('');
                                  setEnvValue('');
                                  setEnvIsSecret(false);
                                }}
                                className="btn btn-secondary"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={envLoading}
                              >
                                {envLoading ? 'Adding...' : 'Add Variable'}
                              </button>
                            </div>
                          </div>
                        </form>
                      )}

                      {envVars.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No environment variables configured
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* User Variables Section - Show First */}
                          {envVars.filter((v: any) => !v.isSystem).length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">User Variables</h3>
                              <div className="space-y-2">
                                {envVars.filter((v: any) => !v.isSystem).map((envVar: any) => (
                                  <div
                                    key={envVar.id}
                                    className="p-3 bg-gray-50 rounded-lg"
                                  >
                                    {editingEnvId === envVar.id ? (
                                      <div className="space-y-3">
                                        <div>
                                          <div className="font-medium text-sm text-gray-900 mb-2">
                                            {envVar.key}
                                          </div>
                                          <input
                                            type={editEnvIsSecret ? 'password' : 'text'}
                                            value={editEnvValue}
                                            onChange={(e: any) => setEditEnvValue(e.target.value)}
                                            className="input w-full"
                                            placeholder="New value"
                                            autoFocus
                                          />
                                        </div>
                                        <div className="flex items-center">
                                          <input
                                            type="checkbox"
                                            id={`edit-secret-${envVar.id}`}
                                            checked={editEnvIsSecret}
                                            onChange={(e: any) => setEditEnvIsSecret(e.target.checked)}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                          />
                                          <label htmlFor={`edit-secret-${envVar.id}`} className="ml-2 block text-sm text-gray-700">
                                            Mark as secret
                                          </label>
                                        </div>
                                        <div className="flex justify-end space-x-2">
                                          <button
                                            onClick={handleCancelEdit}
                                            className="btn btn-secondary text-sm"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() => handleSaveEnvVar(envVar)}
                                            className="btn btn-primary text-sm"
                                            disabled={envLoading}
                                          >
                                            {envLoading ? 'Saving...' : 'Save'}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <div className="font-mono text-sm font-medium text-gray-900 shrink-0">
                                            {envVar.key}
                                          </div>
                                          <div className="text-sm text-gray-500 font-mono truncate">
                                            {envVar.isSecret ? '••••••••' : (envVar.value || 'Value set')}
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-2 shrink-0">
                                          {!envVar.isSecret && envVar.value && (
                                            <button
                                              onClick={() => handleCopyEnvValue(envVar)}
                                              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                                              title="Copy value"
                                            >
                                              {copiedEnvId === envVar.id ? (
                                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                              ) : (
                                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                              )}
                                            </button>
                                          )}
                                          <button
                                            onClick={() => handleEditEnvVar(envVar)}
                                            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                                            title="Edit variable"
                                          >
                                            <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => handleDeleteEnvVar(envVar.id)}
                                            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                                            title="Delete variable"
                                          >
                                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* System Variables Section - Show Second */}
                          {envVars.filter((v: any) => v.isSystem).length > 0 && (
                            <div>
                              <div className="flex items-center space-x-2 mb-3">
                                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">System Variables (Read-Only)</h3>
                              </div>
                              <div className="space-y-2 mb-6">
                                {envVars.filter((v: any) => v.isSystem).map((envVar: any) => (
                                  <div key={envVar.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="font-mono text-sm font-medium text-blue-900 shrink-0">
                                          {envVar.key}
                                        </div>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 shrink-0">
                                          Auto-managed
                                        </span>
                                        <div className="text-sm text-blue-700 font-mono truncate">
                                          {envVar.value || '(value hidden)'}
                                        </div>
                                      </div>
                                      {envVar.value && (
                                        <button
                                          onClick={() => handleCopyEnvValue(envVar)}
                                          className="p-1.5 hover:bg-blue-100 rounded transition-colors shrink-0"
                                          title="Copy value"
                                        >
                                          {copiedEnvId === envVar.id ? (
                                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          ) : (
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Domains Tab */}
                {activeTab === 'domains' && (
                  <div className="space-y-6">
                    {/* Kubidu Subdomain Section */}
                    <div className="card">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Kubidu Subdomain</h2>
                      <p className="text-sm text-gray-600 mb-4">
                        Choose a friendly subdomain for your service. This will be your primary URL.
                      </p>

                      {!editingSubdomain ? (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            {service?.subdomain ? (
                              <>
                                <div className="flex items-center space-x-2">
                                  <div className="font-mono text-lg font-semibold text-primary-600">
                                    {service.subdomain}.127.0.0.1.nip.io
                                  </div>
                                  <button
                                    onClick={handleCopySubdomain}
                                    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                                    title="Copy to clipboard"
                                  >
                                    {copiedSubdomain ? (
                                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  Your service is accessible at this URL
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-gray-500 italic">No subdomain set</div>
                                <div className="text-sm text-gray-500 mt-1">
                                  Set a subdomain to make your service publicly accessible
                                </div>
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSubdomainInput(service?.subdomain || '');
                              setEditingSubdomain(true);
                            }}
                            className="btn btn-secondary ml-4"
                          >
                            {service?.subdomain ? 'Change' : 'Set Subdomain'}
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Subdomain
                              </label>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={subdomainInput}
                                  onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                  className="input flex-1"
                                  placeholder="myapp"
                                  pattern="^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$"
                                />
                                <span className="text-sm text-gray-500 whitespace-nowrap">.127.0.0.1.nip.io</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                {subdomainInput
                                  ? `Your service will be: ${subdomainInput}.127.0.0.1.nip.io`
                                  : 'Lowercase letters, numbers, and hyphens only (2-63 characters)'}
                              </p>
                            </div>
                            <div className="flex justify-end space-x-3">
                              <button
                                onClick={() => {
                                  setEditingSubdomain(false);
                                  setSubdomainInput('');
                                }}
                                className="btn btn-secondary"
                                disabled={subdomainLoading}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    setSubdomainLoading(true);
                                    setError('');
                                    await apiService.updateService(projectId, serviceId, {
                                      subdomain: subdomainInput.trim() || null,
                                    });
                                    await loadService();
                                    setEditingSubdomain(false);
                                    setSubdomainInput('');
                                    if (onServiceUpdated) onServiceUpdated();
                                  } catch (err: any) {
                                    setError(err.response?.data?.message || 'Failed to update subdomain');
                                  } finally {
                                    setSubdomainLoading(false);
                                  }
                                }}
                                className="btn btn-primary"
                                disabled={subdomainLoading}
                              >
                                {subdomainLoading ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Custom Domains Section */}
                    <div className="card">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Custom Domains</h2>
                        <button
                          onClick={() => setShowDomainForm(!showDomainForm)}
                          className="btn btn-primary"
                        >
                          {showDomainForm ? 'Cancel' : 'Add Domain'}
                        </button>
                      </div>

                      {showDomainForm && (
                        <form onSubmit={handleAddDomain} className="mb-6 p-4 bg-gray-50 rounded-lg">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Domain Name
                              </label>
                              <input
                                type="text"
                                value={domainInput}
                                onChange={(e: any) => setDomainInput(e.target.value)}
                                className="input"
                                placeholder="api.example.com"
                                required
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Enter your custom domain (e.g., api.example.com)
                              </p>
                            </div>
                            <div className="flex justify-end space-x-3">
                              <button
                                type="button"
                                onClick={() => setShowDomainForm(false)}
                                className="btn btn-secondary"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={domainLoading}
                              >
                                {domainLoading ? 'Adding...' : 'Add Domain'}
                              </button>
                            </div>
                          </div>
                        </form>
                      )}

                      {domains.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No custom domains configured. Add a domain to get started.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {domains.map((domain: any) => (
                            <div
                              key={domain.id}
                              className="border border-gray-200 rounded-lg p-4"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      {domain.domain}
                                    </h3>
                                    {domain.isVerified ? (
                                      <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                                        Verified
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
                                        Pending Verification
                                      </span>
                                    )}
                                  </div>

                                  {!domain.isVerified && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                      <p className="text-sm font-medium text-blue-900 mb-2">
                                        Verification Required
                                      </p>
                                      <p className="text-sm text-blue-700 mb-2">
                                        Add one of the following DNS records to verify ownership:
                                      </p>
                                      <div className="space-y-2">
                                        <div className="bg-white p-2 rounded border border-blue-200">
                                          <p className="text-xs font-mono text-gray-600">
                                            TXT Record:
                                          </p>
                                          <p className="text-sm font-mono text-gray-900 break-all">
                                            kubidu-verification={domain.verificationCode}
                                          </p>
                                        </div>
                                        <div className="text-xs text-blue-600">
                                          OR
                                        </div>
                                        <div className="bg-white p-2 rounded border border-blue-200">
                                          <p className="text-xs font-mono text-gray-600">
                                            CNAME Record pointing to:
                                          </p>
                                          <p className="text-sm font-mono text-gray-900 break-all">
                                            {deployments.find((d: any) => d.isActive)?.url?.replace('http://', '') || 'your-auto-generated-domain'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <div className="text-sm text-gray-500 mt-2">
                                    Added {formatRelativeTime(domain.createdAt)}
                                    {domain.verifiedAt && ` • Verified ${formatRelativeTime(domain.verifiedAt)}`}
                                  </div>
                                </div>

                                <div className="flex space-x-2 ml-4">
                                  {!domain.isVerified && (
                                    <button
                                      onClick={() => handleVerifyDomain(domain.id)}
                                      className="btn btn-primary text-sm"
                                      disabled={verifyingDomain === domain.id}
                                    >
                                      {verifyingDomain === domain.id ? 'Verifying...' : 'Verify'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteDomain(domain.id)}
                                    className="btn bg-red-600 hover:bg-red-700 text-white text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="card">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Settings</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Service Name
                        </label>
                        <input
                          type="text"
                          value={editedService.name || ''}
                          onChange={(e) => setEditedService({ ...editedService, name: e.target.value })}
                          className="input"
                        />
                      </div>

                      {service?.repositoryUrl && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Branch
                          </label>
                          <input
                            type="text"
                            value={editedService.repositoryBranch || ''}
                            onChange={(e) => setEditedService({ ...editedService, repositoryBranch: e.target.value })}
                            className="input"
                          />
                        </div>
                      )}

                      {service?.dockerImage && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Docker Tag
                          </label>
                          <input
                            type="text"
                            value={editedService.dockerTag || ''}
                            onChange={(e) => setEditedService({ ...editedService, dockerTag: e.target.value })}
                            className="input"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Port
                        </label>
                        <input
                          type="number"
                          value={editedService.defaultPort || 8080}
                          onChange={(e) => setEditedService({ ...editedService, defaultPort: parseInt(e.target.value) })}
                          className="input"
                          min="1"
                          max="65535"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          The port your application listens on inside the container
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Command
                        </label>
                        <input
                          type="text"
                          value={editedService.defaultStartCommand || ''}
                          onChange={(e) => setEditedService({ ...editedService, defaultStartCommand: e.target.value })}
                          className="input"
                          placeholder="e.g., prefect server start"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Override the container's default command (e.g., "prefect server start")
                        </p>
                      </div>

                      <div className="flex justify-between pt-4 border-t border-gray-200">
                        <button
                          onClick={handleDeleteService}
                          className="btn bg-red-600 hover:bg-red-700 text-white"
                        >
                          Delete Service
                        </button>
                        <button
                          onClick={handleUpdateService}
                          className="btn btn-primary"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
