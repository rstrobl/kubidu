import { useState, useEffect, useRef, useMemo } from 'react';
import { apiService } from '../../services/api.service';
import { Service, Deployment, EnvironmentVariable, Domain, SharedVarSource, TabType } from './types';
import { OverviewTab } from './OverviewTab';
import { DeploymentsTab } from './DeploymentsTab';
import { EnvVarsTab } from './EnvVarsTab';
import { DomainsTab } from './DomainsTab';
import { SettingsTab } from './SettingsTab';
import { AutoscalingTab } from './AutoscalingTab';
import { ServiceIcon } from './ServiceIcon';

interface ServiceDetailModalProps {
  projectId: string;
  serviceId: string;
  isOpen: boolean;
  onClose: () => void;
  onServiceUpdated?: () => void;
  initialTab?: TabType;
  onTabChange?: (tab: string) => void;
}

export function ServiceDetailModal({
  projectId,
  serviceId,
  isOpen,
  onClose,
  onServiceUpdated,
  initialTab,
  onTabChange
}: ServiceDetailModalProps) {
  // Core data state
  const [service, setService] = useState<Service | null>(null);
  const [envVars, setEnvVars] = useState<EnvironmentVariable[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [sharedVars, setSharedVars] = useState<SharedVarSource[]>([]);
  const [sharedVarsLoaded, setSharedVarsLoaded] = useState(false);

  // Loading and error state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Tab state
  const [activeTab, setActiveTabState] = useState<TabType>(initialTab || 'overview');
  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    onTabChange?.(tab);
  };

  // Deployment logs state
  const [selectedDeploymentLogs, setSelectedDeploymentLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [buildLogs, setBuildLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [logType, setLogType] = useState<'runtime' | 'build'>('runtime');
  const [lastLogLength, setLastLogLength] = useState<number>(0);
  const [lastBuildLogLength, setLastBuildLogLength] = useState<number>(0);
  const [retryingDeployment, setRetryingDeployment] = useState<string | null>(null);

  // Environment variable state
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
  const [editedService, setEditedService] = useState<Partial<Service>>({});

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

  // Refs for autocomplete inputs
  const addValueRef = useRef<HTMLInputElement>(null);
  const batchTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Build resolved values map for displaying reference values
  const resolvedValues = useMemo(() => {
    const map: Record<string, string> = {};
    for (const source of sharedVars) {
      for (const v of source.variables) {
        if (v.value && v.value !== '***') {
          map[`${source.serviceName}.${v.key}`] = v.value;
        }
      }
    }
    return map;
  }, [sharedVars]);

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
      setSharedVarsLoaded(false);
    }
  }, [isOpen]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && projectId && serviceId) {
      loadService();
      loadEnvVars();
      loadDeployments();
      loadDomains();
    }
  }, [isOpen, projectId, serviceId]);

  // Poll for deployment status updates
  useEffect(() => {
    if (isOpen && activeTab === 'deployments') {
      const interval = setInterval(loadDeployments, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, activeTab, serviceId]);

  // Poll for logs
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
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Load shared vars when env tab is first visited
  useEffect(() => {
    if (isOpen && activeTab === 'env' && !sharedVarsLoaded) {
      loadSharedVars();
    }
  }, [isOpen, activeTab, sharedVarsLoaded]);

  // Data loading functions
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

  const loadSharedVars = async () => {
    try {
      const data = await apiService.getSharedVariables(projectId, serviceId);
      setSharedVars(data);
      setSharedVarsLoaded(true);
    } catch (err: any) {
      console.error('Failed to load shared variables', err);
    }
  };

  const loadLogs = async (deploymentId: string, type: 'runtime' | 'build' = 'runtime', isPolling: boolean = false) => {
    try {
      if (!isPolling) setLogsLoading(true);
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
      if (!isPolling) setLogsLoading(false);
    }
  };

  // Deployment handlers
  const handleViewLogs = (deploymentId: string, defaultType: 'runtime' | 'build') => {
    setSelectedDeploymentLogs(deploymentId);
    setLogType(defaultType);
    loadLogs(deploymentId, defaultType);
  };

  const handleChangeLogType = (type: 'runtime' | 'build', deploymentId: string) => {
    setLogType(type);
    loadLogs(deploymentId, type);
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

  // Environment variable handlers
  const handleAddEnvVar = async () => {
    if (!envKey.trim() || !envValue.trim()) return;
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

  const handleEditEnvVar = async (envVar: EnvironmentVariable) => {
    setEditingEnvId(envVar.id);
    setEditEnvIsSecret(envVar.isSecret || false);
    try {
      const decryptedVars = await apiService.getEnvironmentVariables(serviceId, undefined, true);
      const decryptedVar = decryptedVars.find((v: any) => v.id === envVar.id);
      setEditEnvValue(decryptedVar?.value || '');
    } catch (err) {
      console.error('Failed to decrypt environment variable:', err);
      setEditEnvValue('');
    }
  };

  const handleSaveEnvVar = async (envVar: EnvironmentVariable) => {
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
    if (!confirm('Are you sure you want to delete this environment variable?')) return;
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
        const decryptedVars = await apiService.getEnvironmentVariables(serviceId, undefined, true);
        const userVars = decryptedVars.filter((v: any) => !v.isSystem);
        const text = userVars.map((v: any) => `${v.key}=${v.value || ''}`).join('\n');
        setRawEnvText(text);
      } catch (err) {
        console.error('Failed to decrypt environment variables:', err);
        const userVars = envVars.filter((v) => !v.isSystem);
        const text = userVars.map((v) => `${v.key}=`).join('\n');
        setRawEnvText(text);
      }
    }
    setRawEditMode(!rawEditMode);
  };

  const handleSaveRawEnv = async () => {
    try {
      setEnvLoading(true);
      const lines = rawEnvText.split('\n').filter((line) => line.trim());
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

  const handleToggleShared = async (envVar: EnvironmentVariable) => {
    try {
      const decryptedVars = await apiService.getEnvironmentVariables(serviceId, undefined, true);
      const decryptedVar = decryptedVars.find((v: any) => v.id === envVar.id);
      if (!decryptedVar) return;
      await apiService.createEnvironmentVariable({
        key: envVar.key,
        value: decryptedVar.value,
        isSecret: envVar.isSecret,
        serviceId: serviceId,
        isShared: !envVar.isShared,
      } as any);
      await loadEnvVars();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle sharing');
    }
  };

  const handleCopyEnvValue = async (envVar: EnvironmentVariable) => {
    try {
      await navigator.clipboard.writeText(envVar.value || '');
      setCopiedEnvId(envVar.id);
      setTimeout(() => setCopiedEnvId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Service handlers
  const handleUpdateService = async () => {
    try {
      setIsLoading(true);
      await apiService.updateService(projectId, serviceId, {
        name: editedService.name,
        repositoryBranch: editedService.repositoryBranch,
        dockerTag: editedService.dockerTag,
        defaultPort: editedService.defaultPort,
        defaultStartCommand: editedService.defaultStartCommand || undefined,
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
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) return;
    try {
      await apiService.deleteService(projectId, serviceId);
      if (onServiceUpdated) onServiceUpdated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete service');
    }
  };

  // Domain handlers
  const handleAddDomain = async (e: React.FormEvent) => {
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

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) return;
    try {
      await apiService.deleteDomain(serviceId, domainId);
      await loadDomains();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete domain');
    }
  };

  // Subdomain handlers
  const handleSaveSubdomain = async () => {
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
  };

  const handleCopySubdomain = async () => {
    if (!service?.subdomain) return;
    const fullUrl = `https://${service.subdomain}.127.0.0.1.nip.io`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedSubdomain(true);
      setTimeout(() => setCopiedSubdomain(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
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
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              {service && (
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <ServiceIcon service={service} />
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                  {service?.name || 'Service Detail'}
                </h2>
                {service && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {service.templateDeploymentId
                      ? 'Deployed from Template'
                      : service.serviceType === 'GITHUB'
                        ? service.repositoryUrl?.replace(/^https?:\/\/(www\.)?github\.com\//, '') || 'GitHub'
                        : service.dockerImage || 'Docker Image'}
                    {service.serviceType === 'GITHUB' && service.repositoryBranch
                      ? ` · ${service.repositoryBranch}`
                      : service.serviceType === 'DOCKER_IMAGE' && service.dockerTag
                        ? ` : ${service.dockerTag}`
                        : ''}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 px-6 bg-white">
            <nav className="-mb-px flex space-x-8">
              {(['overview', 'deployments', 'env', 'domains', 'autoscaling', 'settings'] as const).map((tab) => (
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

                {activeTab === 'overview' && service && (
                  <OverviewTab service={service} />
                )}

                {activeTab === 'deployments' && (
                  <DeploymentsTab
                    deployments={deployments}
                    selectedDeploymentLogs={selectedDeploymentLogs}
                    logs={logs}
                    buildLogs={buildLogs}
                    logsLoading={logsLoading}
                    logType={logType}
                    retryingDeployment={retryingDeployment}
                    onViewLogs={handleViewLogs}
                    onChangeLogType={handleChangeLogType}
                    onRetryDeployment={handleRetryDeployment}
                  />
                )}

                {activeTab === 'env' && (
                  <EnvVarsTab
                    envVars={envVars}
                    sharedVars={sharedVars}
                    resolvedValues={resolvedValues}
                    showEnvForm={showEnvForm}
                    envKey={envKey}
                    envValue={envValue}
                    envIsSecret={envIsSecret}
                    envLoading={envLoading}
                    editingEnvId={editingEnvId}
                    editEnvValue={editEnvValue}
                    editEnvIsSecret={editEnvIsSecret}
                    rawEditMode={rawEditMode}
                    rawEnvText={rawEnvText}
                    copiedEnvId={copiedEnvId}
                    addValueRef={addValueRef}
                    batchTextareaRef={batchTextareaRef}
                    onShowEnvFormChange={setShowEnvForm}
                    onEnvKeyChange={setEnvKey}
                    onEnvValueChange={setEnvValue}
                    onEnvIsSecretChange={setEnvIsSecret}
                    onAddEnvVar={handleAddEnvVar}
                    onEditEnvVar={handleEditEnvVar}
                    onSaveEnvVar={handleSaveEnvVar}
                    onCancelEdit={handleCancelEdit}
                    onDeleteEnvVar={handleDeleteEnvVar}
                    onToggleRawEdit={handleToggleRawEdit}
                    onRawEnvTextChange={setRawEnvText}
                    onSaveRawEnv={handleSaveRawEnv}
                    onEditValueChange={setEditEnvValue}
                    onEditIsSecretChange={setEditEnvIsSecret}
                    onToggleShared={handleToggleShared}
                    onCopyEnvValue={handleCopyEnvValue}
                  />
                )}

                {activeTab === 'domains' && service && (
                  <DomainsTab
                    service={service}
                    domains={domains}
                    deployments={deployments}
                    showDomainForm={showDomainForm}
                    domainInput={domainInput}
                    domainLoading={domainLoading}
                    verifyingDomain={verifyingDomain}
                    editingSubdomain={editingSubdomain}
                    subdomainInput={subdomainInput}
                    subdomainLoading={subdomainLoading}
                    copiedSubdomain={copiedSubdomain}
                    onShowDomainFormChange={setShowDomainForm}
                    onDomainInputChange={setDomainInput}
                    onAddDomain={handleAddDomain}
                    onVerifyDomain={handleVerifyDomain}
                    onDeleteDomain={handleDeleteDomain}
                    onEditingSubdomainChange={setEditingSubdomain}
                    onSubdomainInputChange={setSubdomainInput}
                    onSaveSubdomain={handleSaveSubdomain}
                    onCopySubdomain={handleCopySubdomain}
                  />
                )}

                {activeTab === 'autoscaling' && service && (
                  <AutoscalingTab
                    service={service}
                    editedService={editedService}
                    isLoading={isLoading}
                    onEditedServiceChange={(updates) => setEditedService({ ...editedService, ...updates })}
                    onUpdateService={handleUpdateService}
                  />
                )}

                {activeTab === 'settings' && service && (
                  <SettingsTab
                    service={service}
                    editedService={editedService}
                    isLoading={isLoading}
                    onEditedServiceChange={(updates) => setEditedService({ ...editedService, ...updates })}
                    onUpdateService={handleUpdateService}
                    onDeleteService={handleDeleteService}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
