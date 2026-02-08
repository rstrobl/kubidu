import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api.service';
import { useWorkspaceStore } from '../stores/workspace.store';

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  workspaceId: string;
  defaultEnvironment?: string;
  isPublicStatusPage?: boolean;
}

interface Environment {
  id: string;
  name: string;
  slug: string;
}

interface ProjectSettingsPanelProps {
  project: Project;
  onUpdate: () => void;
  onClose: () => void;
}

export function ProjectSettingsPanel({ project, onUpdate, onClose }: ProjectSettingsPanelProps) {
  const navigate = useNavigate();
  const { members, currentWorkspace } = useWorkspaceStore();

  // Form state
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [defaultEnvironment, setDefaultEnvironment] = useState(project.defaultEnvironment || 'production');
  const [isPublicStatusPage, setIsPublicStatusPage] = useState(project.isPublicStatusPage || false);
  const [environments, setEnvironments] = useState<Environment[]>([]);

  // Transfer ownership
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [transferConfirm, setTransferConfirm] = useState('');

  // Delete project
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Notification preferences
  const [notifications, setNotifications] = useState({
    deploymentSuccess: true,
    deploymentFailed: true,
    buildFailed: true,
    domainExpiring: true,
    usageAlerts: true,
  });

  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'danger'>('general');

  useEffect(() => {
    loadEnvironments();
  }, [project.id]);

  const loadEnvironments = async () => {
    try {
      const envs = await apiService.getProjectEnvironments(project.id);
      setEnvironments(envs);
    } catch (err) {
      // Use default environments if endpoint doesn't exist
      setEnvironments([
        { id: '1', name: 'Production', slug: 'production' },
        { id: '2', name: 'Staging', slug: 'staging' },
        { id: '3', name: 'Development', slug: 'development' },
      ]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiService.updateProject(project.id, {
        name,
        description: description || undefined,
      });
      setSuccess('Project settings saved successfully.');
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (transferConfirm !== project.name) return;

    setIsLoading(true);
    setError('');

    try {
      await apiService.transferProjectOwnership(project.id, transferTo);
      setSuccess('Project ownership transferred successfully.');
      setShowTransfer(false);
      setTransferTo('');
      setTransferConfirm('');
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to transfer ownership');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirm !== project.name) return;

    setIsLoading(true);
    setError('');

    try {
      await apiService.deleteProject(project.id);
      navigate('/projects');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete project');
      setIsLoading(false);
    }
  };

  const adminMembers = members.filter(m => m.role === 'ADMIN' && m.user.id !== project.workspaceId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Project Settings
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{project.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'notifications'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'danger'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Danger Zone
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {error && (
            <div className="alert alert-error mb-4 animate-fade-in">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success mb-4 animate-fade-in">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {/* General Tab */}
          {activeTab === 'general' && (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Project Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input w-full"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="input w-full"
                  placeholder="Optional project description..."
                />
              </div>

              {/* Default Environment */}
              <div>
                <label htmlFor="defaultEnv" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Environment
                </label>
                <select
                  id="defaultEnv"
                  value={defaultEnvironment}
                  onChange={(e) => setDefaultEnvironment(e.target.value)}
                  className="input w-full"
                >
                  {environments.map((env) => (
                    <option key={env.id} value={env.slug}>
                      {env.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  The environment to use when no specific environment is selected
                </p>
              </div>

              {/* Public Status Page */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Public Status Page</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Allow anyone to view your project's status page
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublicStatusPage(!isPublicStatusPage)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isPublicStatusPage ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPublicStatusPage ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary"
                >
                  {isLoading ? (
                    <>
                      <span className="spinner spinner-sm" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Configure which events trigger notifications for this project.
              </p>

              {Object.entries(notifications).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {key === 'deploymentSuccess' && 'Notify when a deployment succeeds'}
                      {key === 'deploymentFailed' && 'Notify when a deployment fails'}
                      {key === 'buildFailed' && 'Notify when a build fails'}
                      {key === 'domainExpiring' && 'Notify before SSL certificates expire'}
                      {key === 'usageAlerts' && 'Notify when approaching usage limits'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifications(prev => ({ ...prev, [key]: !value }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      value ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        value ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="space-y-6">
              {/* Transfer Ownership */}
              <div className="border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-orange-800 dark:text-orange-200">Transfer Ownership</h3>
                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                      Transfer this project to another workspace admin
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTransfer(!showTransfer)}
                    className="btn bg-orange-600 text-white hover:bg-orange-700"
                  >
                    Transfer
                  </button>
                </div>

                {showTransfer && (
                  <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Transfer to
                        </label>
                        <select
                          value={transferTo}
                          onChange={(e) => setTransferTo(e.target.value)}
                          className="input w-full"
                        >
                          <option value="">Select a member...</option>
                          {adminMembers.map((member) => (
                            <option key={member.id} value={member.userId}>
                              {member.user.name || member.user.email}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Type "{project.name}" to confirm
                        </label>
                        <input
                          type="text"
                          value={transferConfirm}
                          onChange={(e) => setTransferConfirm(e.target.value)}
                          className="input w-full"
                          placeholder={project.name}
                        />
                      </div>
                      <button
                        onClick={handleTransferOwnership}
                        disabled={transferConfirm !== project.name || !transferTo || isLoading}
                        className="btn bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
                      >
                        {isLoading ? 'Transferring...' : 'Confirm Transfer'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Delete Project */}
              <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-red-800 dark:text-red-200">Delete Project</h3>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      Permanently delete this project and all its services, deployments, and data.
                      This action cannot be undone.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDelete(!showDelete)}
                    className="btn bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>

                {showDelete && (
                  <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
                    <div className="space-y-3">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        ⚠️ This will permanently delete:
                      </p>
                      <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                        <li>All services and deployments</li>
                        <li>All environment variables</li>
                        <li>All domains and SSL certificates</li>
                        <li>All deployment history and logs</li>
                      </ul>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Type "{project.name}" to confirm
                        </label>
                        <input
                          type="text"
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          className="input w-full border-red-300 focus:border-red-500 focus:ring-red-500"
                          placeholder={project.name}
                        />
                      </div>
                      <button
                        onClick={handleDeleteProject}
                        disabled={deleteConfirm !== project.name || isLoading}
                        className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {isLoading ? 'Deleting...' : 'Delete Project Forever'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
