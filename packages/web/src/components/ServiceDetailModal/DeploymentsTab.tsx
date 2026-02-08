import { Deployment } from './types';
import { formatDistanceToNow } from '../../utils/date';

// Helper wrapper to handle string dates
function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { style: 'long' });
}

interface DeploymentsTabProps {
  deployments: Deployment[];
  selectedDeploymentLogs: string | null;
  logs: string;
  buildLogs: string;
  logsLoading: boolean;
  logType: 'runtime' | 'build';
  retryingDeployment: string | null;
  onViewLogs: (deploymentId: string, defaultType: 'runtime' | 'build') => void;
  onChangeLogType: (type: 'runtime' | 'build', deploymentId: string) => void;
  onRetryDeployment: (deploymentId: string) => void;
}

export function DeploymentsTab({
  deployments,
  selectedDeploymentLogs,
  logs,
  buildLogs,
  logsLoading,
  logType,
  retryingDeployment,
  onViewLogs,
  onChangeLogType,
  onRetryDeployment,
}: DeploymentsTabProps) {
  return (
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
                      onClick={() => onRetryDeployment(deployment.id)}
                      className="btn bg-orange-600 hover:bg-orange-700 text-white text-sm"
                      disabled={retryingDeployment === deployment.id}
                    >
                      {retryingDeployment === deployment.id ? 'Retrying...' : 'Retry'}
                    </button>
                  )}
                  {(deployment.status === 'STOPPED' || deployment.status === 'CRASHED') && (
                    <button
                      onClick={() => onRetryDeployment(deployment.id)}
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
                      onViewLogs(deployment.id, defaultType);
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
                          onClick={() => onChangeLogType('runtime', deployment.id)}
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
                        onClick={() => onChangeLogType('build', deployment.id)}
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
  );
}
