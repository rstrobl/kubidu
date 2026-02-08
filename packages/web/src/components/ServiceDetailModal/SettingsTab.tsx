import { Service } from './types';

interface SettingsTabProps {
  service: Service;
  editedService: Partial<Service>;
  isLoading: boolean;
  onEditedServiceChange: (updates: Partial<Service>) => void;
  onUpdateService: () => void;
  onDeleteService: () => void;
}

export function SettingsTab({
  service,
  editedService,
  isLoading,
  onEditedServiceChange,
  onUpdateService,
  onDeleteService,
}: SettingsTabProps) {
  return (
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
            onChange={(e) => onEditedServiceChange({ name: e.target.value })}
            className="input"
          />
        </div>

        {service.repositoryUrl && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch
            </label>
            <input
              type="text"
              value={editedService.repositoryBranch || ''}
              onChange={(e) => onEditedServiceChange({ repositoryBranch: e.target.value })}
              className="input"
            />
          </div>
        )}

        {service.dockerImage && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Docker Tag
            </label>
            <input
              type="text"
              value={editedService.dockerTag || ''}
              onChange={(e) => onEditedServiceChange({ dockerTag: e.target.value })}
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
            onChange={(e) => onEditedServiceChange({ defaultPort: parseInt(e.target.value) })}
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
            onChange={(e) => onEditedServiceChange({ defaultStartCommand: e.target.value })}
            className="input"
            placeholder="e.g., prefect server start"
          />
          <p className="text-xs text-gray-500 mt-1">
            Override the container's default command (e.g., "prefect server start")
          </p>
        </div>

        <div className="flex justify-between pt-4 border-t border-gray-200">
          <button
            onClick={onDeleteService}
            className="btn bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Service
          </button>
          <button
            onClick={onUpdateService}
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
