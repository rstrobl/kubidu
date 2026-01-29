import { useState, useEffect } from 'react';
import { apiService } from '../services/api.service';
import { ProjectUsageStats } from './ProjectUsageStats';

interface ProjectSettingsModalProps {
  projectId: string;
  project: any;
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdated: () => void;
  onProjectDeleted: () => void;
}

export function ProjectSettingsModal({
  projectId,
  project,
  isOpen,
  onClose,
  onProjectUpdated,
  onProjectDeleted,
}: ProjectSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'usage' | 'danger'>('general');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Sync form fields when project changes or modal opens
  useEffect(() => {
    if (isOpen && project) {
      setEditName(project.name || '');
      setEditDescription(project.description || '');
      setError('');
    }
  }, [isOpen, project]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('general');
      setError('');
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      await apiService.updateProject(projectId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      onProjectUpdated();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      setError('');
      await apiService.deleteProject(projectId);
      onProjectDeleted();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete project');
    }
  };

  const tabLabels: Record<typeof activeTab, string> = {
    general: 'General',
    usage: 'Usage',
    danger: 'Danger Zone',
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">
              Project Settings
            </h2>
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
              {(['general', 'usage', 'danger'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? tab === 'danger'
                        ? 'border-red-500 text-red-600'
                        : 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tabLabels[tab]}
                </button>
              ))}
            </nav>
          </div>

          {/* Content - scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6 max-w-lg">
                <div>
                  <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name
                  </label>
                  <input
                    id="project-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input w-full"
                    placeholder="Project name"
                  />
                </div>
                <div>
                  <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    id="project-description"
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="input w-full"
                    placeholder="Description (optional)"
                  />
                </div>
                <div>
                  <button
                    onClick={handleSave}
                    className="btn btn-primary"
                    disabled={isSaving || !editName.trim()}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {/* Usage Tab */}
            {activeTab === 'usage' && (
              <ProjectUsageStats projectId={projectId} />
            )}

            {/* Danger Zone Tab */}
            {activeTab === 'danger' && (
              <div className="max-w-lg">
                <div className="border border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-900">Delete Project</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Permanently delete this project and all of its services, deployments, and data.
                    This action cannot be undone.
                  </p>
                  <button
                    onClick={handleDelete}
                    className="mt-4 btn bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete Project
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
