import { useState } from 'react';
import { formatDistanceToNow } from '../utils/date';
import { apiService } from '../services/api.service';
import { Deployment } from './ServiceDetailModal/types';

interface DeploymentRollbackProps {
  serviceId: string;
  projectId: string;
  currentDeployment: Deployment | null;
  deployments: Deployment[];
  onRollback: () => void;
}

export function DeploymentRollback({
  serviceId,
  projectId,
  currentDeployment,
  deployments,
  onRollback,
}: DeploymentRollbackProps) {
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDiff, setShowDiff] = useState(false);

  // Filter to only show successful past deployments
  const rollbackableDeployments = deployments.filter(
    d => d.id !== currentDeployment?.id && 
    (d.status === 'RUNNING' || d.status === 'STOPPED') &&
    d.deployedAt
  );

  const handleSelectForRollback = (deployment: Deployment) => {
    setSelectedDeployment(deployment);
    setShowConfirm(true);
    setError('');
    setSuccess('');
  };

  const handleRollback = async () => {
    if (!selectedDeployment) return;

    setIsRollingBack(true);
    setError('');

    try {
      await apiService.rollbackDeployment(projectId, serviceId, selectedDeployment.id);
      setSuccess(`Rolled back to deployment ${selectedDeployment.gitCommitSha?.substring(0, 7) || selectedDeployment.name}`);
      setShowConfirm(false);
      setSelectedDeployment(null);
      onRollback();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to rollback deployment');
    } finally {
      setIsRollingBack(false);
    }
  };

  const getDiff = () => {
    if (!currentDeployment || !selectedDeployment) return null;

    const diffs: { field: string; current: string; target: string }[] = [];

    if (currentDeployment.gitCommitSha !== selectedDeployment.gitCommitSha) {
      diffs.push({
        field: 'Commit',
        current: currentDeployment.gitCommitSha?.substring(0, 7) || 'N/A',
        target: selectedDeployment.gitCommitSha?.substring(0, 7) || 'N/A',
      });
    }

    if (currentDeployment.imageTag !== selectedDeployment.imageTag) {
      diffs.push({
        field: 'Image Tag',
        current: currentDeployment.imageTag || 'latest',
        target: selectedDeployment.imageTag || 'latest',
      });
    }

    if (currentDeployment.replicas !== selectedDeployment.replicas) {
      diffs.push({
        field: 'Replicas',
        current: String(currentDeployment.replicas || 1),
        target: String(selectedDeployment.replicas || 1),
      });
    }

    if (currentDeployment.cpuLimit !== selectedDeployment.cpuLimit) {
      diffs.push({
        field: 'CPU Limit',
        current: currentDeployment.cpuLimit || '500m',
        target: selectedDeployment.cpuLimit || '500m',
      });
    }

    if (currentDeployment.memoryLimit !== selectedDeployment.memoryLimit) {
      diffs.push({
        field: 'Memory Limit',
        current: currentDeployment.memoryLimit || '512Mi',
        target: selectedDeployment.memoryLimit || '512Mi',
      });
    }

    return diffs;
  };

  const diff = getDiff();

  return (
    <div className="space-y-4">
      {error && (
        <div className="alert alert-error animate-fade-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success animate-fade-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {/* Rollback History */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
          </svg>
          Previous Deployments
        </h4>

        {rollbackableDeployments.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">No previous deployments available for rollback</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rollbackableDeployments.slice(0, 10).map((deployment) => (
              <div
                key={deployment.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    {deployment.gitCommitSha ? (
                      <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-gray-900 dark:text-white">
                        {deployment.gitCommitSha?.substring(0, 7) || deployment.imageTag || deployment.name}
                      </code>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        deployment.status === 'RUNNING' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {deployment.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {deployment.gitCommitMessage?.substring(0, 50) || 'No commit message'}
                      {deployment.gitCommitMessage && deployment.gitCommitMessage.length > 50 && '...'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Deployed {formatDistanceToNow(new Date(deployment.deployedAt || deployment.createdAt), { style: 'long' })}
                      {deployment.gitAuthor && ` by ${deployment.gitAuthor}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSelectForRollback(deployment)}
                  className="btn btn-sm btn-secondary"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Rollback
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && selectedDeployment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirm Rollback
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This will deploy a previous version of your service
                </p>
              </div>
            </div>

            {/* Target Info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rolling back to:</p>
              <div className="flex items-center gap-2">
                <code className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                  {selectedDeployment.gitCommitSha?.substring(0, 7) || selectedDeployment.imageTag || selectedDeployment.name}
                </code>
              </div>
              {selectedDeployment.gitCommitMessage && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">
                  "{selectedDeployment.gitCommitMessage}"
                </p>
              )}
            </div>

            {/* Diff Toggle */}
            {diff && diff.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => setShowDiff(!showDiff)}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <svg className={`w-4 h-4 transition-transform ${showDiff ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {showDiff ? 'Hide' : 'Show'} changes ({diff.length})
                </button>

                {showDiff && (
                  <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Field</th>
                          <th className="px-3 py-2 text-left font-medium text-red-600">Current</th>
                          <th className="px-3 py-2 text-left font-medium text-green-600">Target</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {diff.map((d, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{d.field}</td>
                            <td className="px-3 py-2 text-red-600 font-mono">{d.current}</td>
                            <td className="px-3 py-2 text-green-600 font-mono">{d.target}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setSelectedDeployment(null);
                }}
                className="btn btn-secondary flex-1"
                disabled={isRollingBack}
              >
                Cancel
              </button>
              <button
                onClick={handleRollback}
                disabled={isRollingBack}
                className="btn bg-orange-600 text-white hover:bg-orange-700 flex-1"
              >
                {isRollingBack ? (
                  <>
                    <span className="spinner spinner-sm" />
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
