import { useState, useEffect } from 'react';
import { apiService } from '../../services/api.service';

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
}

interface VolumesTabProps {
  projectId: string;
  serviceId: string;
  serviceName: string;
}

const VOLUME_SIZES = [
  { value: '1Gi', label: '1 GB' },
  { value: '5Gi', label: '5 GB' },
  { value: '10Gi', label: '10 GB' },
  { value: '20Gi', label: '20 GB' },
  { value: '50Gi', label: '50 GB' },
] as const;

export function VolumesTab({ projectId, serviceId, serviceName }: VolumesTabProps) {
  const [allVolumes, setAllVolumes] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Attach modal state
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachForm, setAttachForm] = useState({ volumeId: '', mountPath: '/data' });
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState('');

  // Filter volumes
  const attachedVolumes = allVolumes.filter(v => v.serviceId === serviceId);
  const availableVolumes = allVolumes.filter(v => !v.serviceId);

  const loadVolumes = async () => {
    try {
      setLoading(true);
      const data = await apiService.getVolumes(projectId);
      setAllVolumes(data);
    } catch (err: any) {
      setError(err.userMessage || 'Failed to load volumes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVolumes();
  }, [projectId]);

  const handleAttach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachForm.volumeId) return;
    
    setAttachError('');
    setAttaching(true);
    
    try {
      await apiService.attachVolume(projectId, attachForm.volumeId, {
        serviceId,
        mountPath: attachForm.mountPath,
      });
      setShowAttachModal(false);
      setAttachForm({ volumeId: '', mountPath: '/data' });
      loadVolumes();
    } catch (err: any) {
      setAttachError(err.userMessage || 'Failed to attach volume');
    } finally {
      setAttaching(false);
    }
  };

  const handleDetach = async (volume: Volume) => {
    if (!confirm(`Detach volume "${volume.name}" from this service?`)) return;
    
    try {
      await apiService.detachVolume(projectId, volume.id);
      loadVolumes();
    } catch (err: any) {
      setError(err.userMessage || 'Failed to detach volume');
    }
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
          <h3 className="text-lg font-medium text-gray-900">Volumes</h3>
          <p className="text-sm text-gray-500">Persistent storage attached to this service</p>
        </div>
        {availableVolumes.length > 0 && (
          <button
            onClick={() => setShowAttachModal(true)}
            className="btn btn-secondary"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Attach Volume
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Attached Volumes */}
      {attachedVolumes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No volumes attached</h3>
          <p className="text-sm text-gray-500 mb-4">
            {availableVolumes.length > 0
              ? 'Attach an existing volume to persist data across deployments'
              : 'Create a volume in the Volumes tab first'}
          </p>
          {availableVolumes.length > 0 && (
            <button
              onClick={() => setShowAttachModal(true)}
              className="btn btn-primary"
            >
              Attach Volume
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {attachedVolumes.map((volume) => (
            <div
              key={volume.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{volume.name}</div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{getSizeLabel(volume.size)}</span>
                    <span>•</span>
                    <span className="font-mono">{volume.mountPath}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDetach(volume)}
                className="btn btn-secondary btn-sm text-orange-600 hover:text-orange-700"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Detach
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Available Volumes Info */}
      {availableVolumes.length > 0 && attachedVolumes.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-blue-700">
              {availableVolumes.length} unattached volume{availableVolumes.length !== 1 ? 's' : ''} available.{' '}
              <button onClick={() => setShowAttachModal(true)} className="underline font-medium">
                Attach another
              </button>
            </span>
          </div>
        </div>
      )}

      {/* Attach Modal */}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowAttachModal(false)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Attach Volume to {serviceName}</h3>
              {attachError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {attachError}
                </div>
              )}
              <form onSubmit={handleAttach}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volume</label>
                  <select
                    value={attachForm.volumeId}
                    onChange={(e) => {
                      const vol = availableVolumes.find(v => v.id === e.target.value);
                      setAttachForm({
                        volumeId: e.target.value,
                        mountPath: vol?.mountPath || '/data',
                      });
                    }}
                    className="input"
                    required
                  >
                    <option value="">Select a volume</option>
                    {availableVolumes.map((vol) => (
                      <option key={vol.id} value={vol.id}>
                        {vol.name} ({getSizeLabel(vol.size)})
                      </option>
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
                  <p className="mt-1 text-xs text-gray-500">
                    The path where the volume will be mounted inside the container
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowAttachModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={attaching || !attachForm.volumeId}>
                    {attaching ? 'Attaching...' : 'Attach Volume'}
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
