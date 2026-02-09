import { useState } from 'react';
import { Deployment } from './types';
import { formatDistanceToNow } from '../../utils/date';
import { LogViewer } from './LogViewer';
import { apiService } from '../../services/api.service';

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
  const [rollbackTarget, setRollbackTarget] = useState<Deployment | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackError, setRollbackError] = useState('');
  const [rollbackSuccess, setRollbackSuccess] = useState('');
  
  const activeDeployment = deployments.find(d => d.isActive) || null;
  
  // Check if a deployment is eligible for rollback
  const canRollback = (deployment: Deployment): boolean => {
    // Must have serviceId and projectId
    if (!serviceId || !projectId) return false;
    // Can't rollback to the active deployment
    if (deployment.isActive) return false;
    // Only successful deployments (RUNNING or STOPPED means it was deployed successfully)
    if (!['RUNNING', 'STOPPED'].includes(deployment.status)) return false;
    // Must have been deployed
    if (!deployment.deployedAt && !deployment.createdAt) return false;
    return true;
  };
  
  const handleRollbackClick = (deployment: Deployment) => {
    setRollbackTarget(deployment);
    setRollbackError('');
    setRollbackSuccess('');
  };
  
  const handleConfirmRollback = async () => {
    if (!rollbackTarget || !serviceId || !projectId) return;
    
    setIsRollingBack(true);
    setRollbackError('');
    
    try {
      await apiService.rollbackDeployment(projectId, serviceId, rollbackTarget.id);
      setRollbackSuccess(`Rolling back to ${rollbackTarget.gitCommitSha?.substring(0, 7) || rollbackTarget.imageTag || rollbackTarget.name}`);
      setRollbackTarget(null);
      onDeploymentsChange?.();
    } catch (err: any) {
      setRollbackError(err.response?.data?.message || 'Failed to rollback deployment');
    } finally {
      setIsRollingBack(false);
    }
  };
  
  const getDeploymentLabel = (deployment: Deployment): string => {
    if (deployment.gitCommitSha) {
      return deployment.gitCommitSha.substring(0, 7);
    }
    if (deployment.imageTag) {
      return deployment.imageTag;
    }
    return deployment.name;
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Deployments</h3>
      
      {/* Success/Error Messages */}
      {rollbackError && (
        <div className="alert alert-error animate-fade-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{rollbackError}</span>
          <button onClick={() => setRollbackError('')} className="ml-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {rollbackSuccess && (
        <div className="alert alert-success animate-fade-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{rollbackSuccess}</span>
          <button onClick={() => setRollbackSuccess('')} className="ml-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
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

            const showRollback = canRollback(deployment);

            return (
              <div key={deployment.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{deploymentLabel}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(deployment.createdAt)}
                      {deployment.gitAuthor && ` by ${deployment.gitAuthor}`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {deployment.isActive && (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Active
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      deployment.status === 'RUNNING' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      deployment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      deployment.status === 'FAILED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      deployment.status === 'CRASHED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      deployment.status === 'STOPPED' ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {deployment.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
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
                  
                  {/* Rollback Button - only for eligible deployments */}
                  {showRollback && (
                    <button
                      onClick={() => handleRollbackClick(deployment)}
                      className="btn btn-secondary text-sm flex items-center gap-1"
                      title="Rollback to this version"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Rollback
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
                              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
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
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
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
      
      {/* Rollback Confirmation Modal */}
      {rollbackTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirm Rollback
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Deploy a previous version
                </p>
              </div>
            </div>

            {/* Target Info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rolling back to:</p>
              <div className="flex items-center gap-2">
                <code className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                  {getDeploymentLabel(rollbackTarget)}
                </code>
              </div>
              {rollbackTarget.gitCommitMessage && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">
                  "{rollbackTarget.gitCommitMessage}"
                </p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Deployed {formatRelativeTime(rollbackTarget.deployedAt || rollbackTarget.createdAt)}
              </p>
            </div>

            {/* Current vs Target */}
            {activeDeployment && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <span className="font-medium">Current:</span>{' '}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  {getDeploymentLabel(activeDeployment)}
                </code>
                {' → '}
                <code className="bg-orange-100 dark:bg-orange-900 px-1 rounded text-orange-700 dark:text-orange-300">
                  {getDeploymentLabel(rollbackTarget)}
                </code>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setRollbackTarget(null)}
                className="btn btn-secondary flex-1"
                disabled={isRollingBack}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRollback}
                disabled={isRollingBack}
                className="btn bg-orange-600 text-white hover:bg-orange-700 flex-1"
              >
                {isRollingBack ? (
                  <>
                    <span className="spinner spinner-sm mr-2" />
                    Rolling back...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Confirm Rollback
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
