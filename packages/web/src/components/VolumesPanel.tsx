import { useState, useEffect } from 'react';
import { apiService } from '../services/api.service';

interface Volume {
  id: string;
  name: string;
  size: string;
  mountPath: string;
  status: 'PENDING' | 'BOUND' | 'RELEASED' | 'FAILED';
  serviceId: string | null;
  service?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  boundAt: string | null;
}

interface Service {
  id: string;
  name: string;
}

interface VolumesPanelProps {
  projectId: string;
  services: Service[];
  onVolumeChange?: () => void;
}

const VOLUME_SIZES = [
  { value: '1Gi', label: '1 GB', price: '$0.50/mo' },
  { value: '5Gi', label: '5 GB', price: '$2.50/mo' },
  { value: '10Gi', label: '10 GB', price: '$5/mo' },
  { value: '20Gi', label: '20 GB', price: '$10/mo' },
  { value: '50Gi', label: '50 GB', price: '$25/mo' },
] as const;

type VolumeSize = typeof VOLUME_SIZES[number]['value'];

export function VolumesPanel({ projectId, services, onVolumeChange }: VolumesPanelProps) {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', size: '5Gi' as VolumeSize, mountPath: '/data' });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Attach modal state
  const [attachingVolume, setAttachingVolume] = useState<Volume | null>(null);
  const [attachForm, setAttachForm] = useState({ serviceId: '', mountPath: '/data' });
  const [attachError, setAttachError] = useState('');
  const [attaching, setAttaching] = useState(false);
  
  // Edit modal state
  const [editingVolume, setEditingVolume] = useState<Volume | null>(null);
  const [editForm, setEditForm] = useState({ name: '', size: '' as VolumeSize });
  const [editError, setEditError] = useState('');
  const [editing, setEditing] = useState(false);

  const loadVolumes = async () => {
    try {
      setLoading(true);
      const data = await apiService.getVolumes(projectId);
      setVolumes(data);
    } catch (err: any) {
      setError(err.userMessage || 'Failed to load volumes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVolumes();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    
    try {
      await apiService.createVolume(projectId, createForm);
      setShowCreateModal(false);
      setCreateForm({ name: '', size: '5Gi', mountPath: '/data' });
      loadVolumes();
      onVolumeChange?.();
    } catch (err: any) {
      setCreateError(err.userMessage || 'Failed to create volume');
    } finally {
      setCreating(false);
    }
  };

  const handleAttach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachingVolume) return;
    setAttachError('');
    setAttaching(true);
    
    try {
      await apiService.attachVolume(projectId, attachingVolume.id, attachForm);
      setAttachingVolume(null);
      setAttachForm({ serviceId: '', mountPath: '/data' });
      loadVolumes();
      onVolumeChange?.();
    } catch (err: any) {
      setAttachError(err.userMessage || 'Failed to attach volume');
    } finally {
      setAttaching(false);
    }
  };

  const handleDetach = async (volume: Volume) => {
    if (!confirm(`Detach volume "${volume.name}" from ${volume.service?.name}?`)) return;
    
    try {
      await apiService.detachVolume(projectId, volume.id);
      loadVolumes();
      onVolumeChange?.();
    } catch (err: any) {
      setError(err.userMessage || 'Failed to detach volume');
    }
  };

  const handleDelete = async (volume: Volume) => {
    if (!confirm(`Delete volume "${volume.name}"? This action cannot be undone.`)) return;
    
    try {
      await apiService.deleteVolume(projectId, volume.id);
      loadVolumes();
      onVolumeChange?.();
    } catch (err: any) {
      setError(err.userMessage || 'Failed to delete volume');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVolume) return;
    setEditError('');
    setEditing(true);
    
    try {
      const updates: any = {};
      if (editForm.name !== editingVolume.name) updates.name = editForm.name;
      if (editForm.size !== editingVolume.size) updates.size = editForm.size;
      
      if (Object.keys(updates).length > 0) {
        await apiService.updateVolume(projectId, editingVolume.id, updates);
      }
      setEditingVolume(null);
      loadVolumes();
      onVolumeChange?.();
    } catch (err: any) {
      setEditError(err.userMessage || 'Failed to update volume');
    } finally {
      setEditing(false);
    }
  };

  const getStatusBadge = (status: Volume['status']) => {
    const styles: Record<Volume['status'], string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      BOUND: 'bg-green-100 text-green-800',
      RELEASED: 'bg-gray-100 text-gray-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getSizeLabel = (size: string) => {
    const found = VOLUME_SIZES.find(s => s.value === size);
    return found ? found.label : size;
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Loading volumes...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Volumes</h2>
          <p className="text-sm text-gray-500">Persistent storage for your services</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <svg className="w-5 h-5 -ml-1 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Volume
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Volumes List */}
      {volumes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No volumes yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create a volume to persist data across deployments</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            Create Your First Volume
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attached To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mount Path</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {volumes.map((volume) => (
                <tr key={volume.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </div>
                      <span className="font-medium text-gray-900">{volume.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getSizeLabel(volume.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(volume.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {volume.service ? (
                      <span className="text-primary-600 font-medium">{volume.service.name}</span>
                    ) : (
                      <span className="text-gray-400">Not attached</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    {volume.mountPath}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      {volume.serviceId ? (
                        <button
                          onClick={() => handleDetach(volume)}
                          className="text-orange-600 hover:text-orange-800"
                          title="Detach from service"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setAttachingVolume(volume);
                            setAttachForm({ serviceId: services[0]?.id || '', mountPath: volume.mountPath });
                          }}
                          className="text-primary-600 hover:text-primary-800"
                          title="Attach to service"
                          disabled={services.length === 0}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingVolume(volume);
                          setEditForm({ name: volume.name, size: volume.size as VolumeSize });
                        }}
                        className="text-gray-600 hover:text-gray-800"
                        title="Edit volume"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(volume)}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        title={volume.serviceId ? 'Detach before deleting' : 'Delete volume'}
                        disabled={!!volume.serviceId}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowCreateModal(false)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Create Volume</h3>
              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {createError}
                </div>
              )}
              <form onSubmit={handleCreate}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    className="input"
                    placeholder="my-data-volume"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                  <div className="grid grid-cols-5 gap-2">
                    {VOLUME_SIZES.map((size) => (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, size: size.value })}
                        className={`p-2 rounded-lg border text-center transition-colors ${
                          createForm.size === size.value
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{size.label}</div>
                        <div className="text-xs text-gray-500">{size.price}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Mount Path</label>
                  <input
                    type="text"
                    value={createForm.mountPath}
                    onChange={(e) => setCreateForm({ ...createForm, mountPath: e.target.value })}
                    className="input font-mono"
                    placeholder="/data"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={creating || !createForm.name}>
                    {creating ? 'Creating...' : 'Create Volume'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Attach Modal */}
      {attachingVolume && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setAttachingVolume(null)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Attach Volume: {attachingVolume.name}</h3>
              {attachError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {attachError}
                </div>
              )}
              <form onSubmit={handleAttach}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                  <select
                    value={attachForm.serviceId}
                    onChange={(e) => setAttachForm({ ...attachForm, serviceId: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Select a service</option>
                    {services.map((svc) => (
                      <option key={svc.id} value={svc.id}>{svc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mount Path</label>
                  <input
                    type="text"
                    value={attachForm.mountPath}
                    onChange={(e) => setAttachForm({ ...attachForm, mountPath: e.target.value })}
                    className="input font-mono"
                    placeholder="/data"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">The path where the volume will be mounted inside the container</p>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setAttachingVolume(null)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={attaching || !attachForm.serviceId}>
                    {attaching ? 'Attaching...' : 'Attach Volume'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingVolume && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setEditingVolume(null)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Edit Volume: {editingVolume.name}</h3>
              {editError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {editError}
                </div>
              )}
              <form onSubmit={handleEdit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    className="input"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size (can only increase)</label>
                  <div className="grid grid-cols-5 gap-2">
                    {VOLUME_SIZES.map((size) => {
                      const currentIdx = VOLUME_SIZES.findIndex(s => s.value === editingVolume.size);
                      const sizeIdx = VOLUME_SIZES.findIndex(s => s.value === size.value);
                      const disabled = sizeIdx < currentIdx;
                      return (
                        <button
                          key={size.value}
                          type="button"
                          onClick={() => !disabled && setEditForm({ ...editForm, size: size.value })}
                          disabled={disabled}
                          className={`p-2 rounded-lg border text-center transition-colors ${
                            editForm.size === size.value
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : disabled
                                ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                                : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-sm">{size.label}</div>
                          <div className="text-xs text-gray-500">{size.price}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setEditingVolume(null)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={editing}>
                    {editing ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
