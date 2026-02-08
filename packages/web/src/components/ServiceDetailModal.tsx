import { useState, useEffect, useRef, useMemo } from 'react';
import { apiService } from '../services/api.service';
import { useEnvVarAutocomplete } from '../hooks/useEnvVarAutocomplete';
import { EnvVarAutocomplete } from './EnvVarAutocomplete';
import { EnvVarValueDisplay } from './EnvVarValueDisplay';
import { formatDistanceToNow } from '../utils/date';

interface ServiceDetailModalProps {
  projectId: string;
  serviceId: string;
  isOpen: boolean;
  onClose: () => void;
  onServiceUpdated?: () => void;
  initialTab?: 'overview' | 'settings' | 'env' | 'domains' | 'deployments';
  onTabChange?: (tab: string) => void;
}

// Helper wrapper to handle string dates
function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { style: 'long' });
}

// Sub-component for editing env var rows (needed for hooks inside .map())
interface EnvVarEditRowProps {
  envVar: any;
  isEditing: boolean;
  editValue: string;
  editIsSecret: boolean;
  envLoading: boolean;
  copiedEnvId: string | null;
  sharedVars: any[];
  resolvedValues: Record<string, string>;
  onEditValueChange: (value: string) => void;
  onEditIsSecretChange: (checked: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleShared: () => void;
  onCopy: () => void;
}

function EnvVarEditRow({
  envVar,
  isEditing,
  editValue,
  editIsSecret,
  envLoading,
  copiedEnvId,
  sharedVars,
  resolvedValues,
  onEditValueChange,
  onEditIsSecretChange,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  onToggleShared,
  onCopy,
}: EnvVarEditRowProps) {
  const editInputRef = useRef<HTMLInputElement>(null);
  const editAutocomplete = useEnvVarAutocomplete({ sharedVars, inputRef: editInputRef });

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <div className="font-medium text-sm text-gray-900 mb-2">
              {envVar.key}
            </div>
            <div className="relative">
              <input
                ref={editInputRef}
                type={editIsSecret ? 'password' : 'text'}
                value={editValue}
                onChange={(e: any) => {
                  onEditValueChange(e.target.value);
                  editAutocomplete.handleInputChange(e);
                }}
                onKeyDown={editAutocomplete.handleKeyDown}
                className="input w-full"
                placeholder='Value or ${{ to reference'
                autoFocus
              />
              <EnvVarAutocomplete
                isOpen={editAutocomplete.isOpen}
                groupedItems={editAutocomplete.groupedItems}
                activeIndex={editAutocomplete.activeIndex}
                onSelect={editAutocomplete.selectItem}
              />
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`edit-secret-${envVar.id}`}
              checked={editIsSecret}
              onChange={(e: any) => onEditIsSecretChange(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor={`edit-secret-${envVar.id}`} className="ml-2 block text-sm text-gray-700">
              Mark as secret
            </label>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={onCancel}
              className="btn btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
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
            {envVar.reference ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 shrink-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {envVar.reference.sourceServiceName}
                </span>
                <div className="truncate">
                  <EnvVarValueDisplay value={envVar.value} isSecret={envVar.isSecret} resolvedValues={resolvedValues} />
                </div>
              </div>
            ) : (
              <div className="truncate">
                <EnvVarValueDisplay value={envVar.value} isSecret={envVar.isSecret} resolvedValues={resolvedValues} />
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onToggleShared}
              className={`p-1.5 rounded transition-colors ${envVar.isShared ? 'bg-teal-100 hover:bg-teal-200' : 'hover:bg-gray-200'}`}
              title={envVar.isShared ? 'Shared with other services (click to unshare)' : 'Share with other services'}
            >
              <svg className={`w-4 h-4 ${envVar.isShared ? 'text-teal-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            {!envVar.isSecret && envVar.value && (
              <button
                onClick={onCopy}
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
              onClick={onEdit}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              title="Edit variable"
            >
              <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
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
  );
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

  // Shared variables for autocomplete
  const [sharedVars, setSharedVars] = useState<any[]>([]);
  const [sharedVarsLoaded, setSharedVarsLoaded] = useState(false);

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
      setSharedVarsLoaded(false);
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

  // Load shared vars when env tab is first visited (for autocomplete)
  useEffect(() => {
    if (isOpen && activeTab === 'env' && !sharedVarsLoaded) {
      loadSharedVars();
    }
  }, [isOpen, activeTab, sharedVarsLoaded]);

  // Refs for autocomplete inputs
  const addValueRef = useRef<HTMLInputElement>(null);
  const batchTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Autocomplete hooks for add form and batch edit
  const addAutocomplete = useEnvVarAutocomplete({ sharedVars, inputRef: addValueRef });
  const batchAutocomplete = useEnvVarAutocomplete({ sharedVars, inputRef: batchTextareaRef });

  // Build "ServiceName.KEY" → value map for displaying resolved reference values
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

  const handleToggleShared = async (envVar: any) => {
    try {
      // Fetch decrypted value first
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
    const fullUrl = `https://${service.subdomain}.127.0.0.1.nip.io`;
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
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              {service && (
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {(() => {
                    const imageOrName = (service.dockerImage || service.name || '').toLowerCase();
                    if (imageOrName.includes('postgres') || imageOrName.includes('postgresql')) {
                      return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" alt="PostgreSQL" className="w-5 h-5" />;
                    }
                    if (imageOrName.includes('mysql') || imageOrName.includes('mariadb')) {
                      return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg" alt="MySQL" className="w-5 h-5" />;
                    }
                    if (imageOrName.includes('redis')) {
                      return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg" alt="Redis" className="w-5 h-5" />;
                    }
                    if (imageOrName.includes('mongo')) {
                      return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" alt="MongoDB" className="w-5 h-5" />;
                    }
                    if (imageOrName.includes('wordpress') || imageOrName.includes('wp-')) {
                      return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/wordpress/wordpress-plain.svg" alt="WordPress" className="w-5 h-5" />;
                    }
                    if (imageOrName.includes('n8n')) {
                      return <img src="https://n8n.io/favicon.ico" alt="n8n" className="w-5 h-5" />;
                    }
                    if (imageOrName.includes('ghost')) {
                      return <img src="https://ghost.org/favicon.ico" alt="Ghost" className="w-5 h-5" />;
                    }
                    if (imageOrName.includes('prefect')) {
                      return <img src="https://api.iconify.design/simple-icons/prefect.svg" alt="Prefect" className="w-5 h-5" />;
                    }
                    if (imageOrName.includes('directus')) {
                      return <img src="https://raw.githubusercontent.com/directus/directus/main/app/public/favicon.ico" alt="Directus" className="w-5 h-5" />;
                    }
                    if (service.templateDeploymentId) {
                      return (
                        <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="3" width="7" height="7" rx="1" />
                          <rect x="3" y="14" width="7" height="7" rx="1" />
                          <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                      );
                    }
                    if (service.serviceType === 'GITHUB') {
                      return (
                        <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                      );
                    }
                    return (
                      <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H5.136a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z" />
                      </svg>
                    );
                  })()}
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

                        {service.templateDeploymentId && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Origin</label>
                            <p className="mt-1 text-sm text-gray-900">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Template
                              </span>
                            </p>
                          </div>
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
                                    deployment.status === 'CRASHED' ? 'bg-red-100 text-red-800' :
                                    deployment.status === 'STOPPED' ? 'bg-gray-100 text-gray-600' :
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
                              {(deployment.status === 'STOPPED' || deployment.status === 'CRASHED') && (
                                <button
                                  onClick={() => handleRetryDeployment(deployment.id)}
                                  className="btn bg-primary-600 hover:bg-primary-700 text-white text-sm"
                                  disabled={retryingDeployment === deployment.id}
                                >
                                  {retryingDeployment === deployment.id ? 'Redeploying...' : 'Redeploy'}
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
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900">Environment Variables</h2>
                          <p className="text-xs text-gray-500 mt-1">
                            Type <code className="bg-gray-100 px-1 rounded">{"${{"}</code> in a value field to reference variables from other services.
                          </p>
                        </div>
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
                          <div className="relative">
                            <textarea
                              ref={batchTextareaRef}
                              value={rawEnvText}
                              onChange={(e: any) => {
                                setRawEnvText(e.target.value);
                                batchAutocomplete.handleInputChange(e);
                              }}
                              onKeyDown={batchAutocomplete.handleKeyDown}
                              className="input font-mono text-sm"
                              rows={10}
                              placeholder={"DATABASE_URL=postgres://...\nAPI_KEY=${{OtherService.API_KEY}}\nPORT=3000"}
                            />
                            <EnvVarAutocomplete
                              isOpen={batchAutocomplete.isOpen}
                              groupedItems={batchAutocomplete.groupedItems}
                              activeIndex={batchAutocomplete.activeIndex}
                              onSelect={batchAutocomplete.selectItem}
                            />
                          </div>
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
                              <div className="relative">
                                <input
                                  ref={addValueRef}
                                  type={envIsSecret ? 'password' : 'text'}
                                  value={envValue}
                                  onChange={(e) => {
                                    setEnvValue(e.target.value);
                                    addAutocomplete.handleInputChange(e);
                                  }}
                                  onKeyDown={addAutocomplete.handleKeyDown}
                                  className="input w-full"
                                  placeholder='Value or ${{ to reference'
                                  required
                                />
                                <EnvVarAutocomplete
                                  isOpen={addAutocomplete.isOpen}
                                  groupedItems={addAutocomplete.groupedItems}
                                  activeIndex={addAutocomplete.activeIndex}
                                  onSelect={addAutocomplete.selectItem}
                                />
                              </div>
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
                                  <EnvVarEditRow
                                    key={envVar.id}
                                    envVar={envVar}
                                    isEditing={editingEnvId === envVar.id}
                                    editValue={editEnvValue}
                                    editIsSecret={editEnvIsSecret}
                                    envLoading={envLoading}
                                    copiedEnvId={copiedEnvId}
                                    sharedVars={sharedVars}
                                    resolvedValues={resolvedValues}
                                    onEditValueChange={setEditEnvValue}
                                    onEditIsSecretChange={setEditEnvIsSecret}
                                    onSave={() => handleSaveEnvVar(envVar)}
                                    onCancel={handleCancelEdit}
                                    onEdit={() => handleEditEnvVar(envVar)}
                                    onDelete={() => handleDeleteEnvVar(envVar.id)}
                                    onToggleShared={() => handleToggleShared(envVar)}
                                    onCopy={() => handleCopyEnvValue(envVar)}
                                  />
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
                                    https://{service.subdomain}.127.0.0.1.nip.io
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
                                  ? `Your service will be: https://${subdomainInput}.127.0.0.1.nip.io`
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
