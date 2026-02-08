import { useState } from 'react';
import { Deployment } from './types';
import { formatDistanceToNow } from '../../utils/date';
import { LogViewer } from './LogViewer';
import { DeploymentRollback } from '../DeploymentRollback';

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
  serviceId?: string;
  projectId?: string;
  onDeploymentsChange?: () => void;
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
  serviceId,
  projectId,
  onDeploymentsChange,
}: DeploymentsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'history' | 'rollback'>('history');
  
  const activeDeployment = deployments.find(d => d.isActive) || null;
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Deployments</h3>
        
        {/* Sub-tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeSubTab === 'history'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveSubTab('rollback')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeSubTab === 'rollback'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Rollback
          </button>
        </div>
      </div>
      
      {/* Rollback Tab */}
      {activeSubTab === 'rollback' && serviceId && projectId && (
        <DeploymentRollback
          serviceId={serviceId}
          projectId={projectId}
          currentDeployment={activeDeployment}
          deployments={deployments}
          onRollback={() => onDeploymentsChange?.()}
        />
      )}
      
      {/* History Tab */}
      {activeSubTab === 'history' && (
        <>
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
                    <LogViewer
                      logs={logType === 'runtime' ? logs : buildLogs}
                      isLoading={logsLoading}
                      isStreaming={logType === 'runtime' && deployment.status === 'RUNNING'}
                      title={logType === 'runtime' ? 'Runtime Logs' : 'Build Logs'}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
}
