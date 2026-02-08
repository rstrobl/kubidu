import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspace.store';
import { apiService } from '../services/api.service';
import { format, formatDistanceToNow } from '../utils/date';

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

const ACTION_ICONS: Record<string, string> = {
  'create': '➕',
  'update': '✏️',
  'delete': '🗑️',
  'deploy': '🚀',
  'login': '🔐',
  'logout': '👋',
  'invite': '📧',
  'accept': '✅',
  'reject': '❌',
  'enable': '🟢',
  'disable': '🔴',
};

const ACTION_COLORS: Record<string, string> = {
  'create': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'update': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'delete': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'deploy': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'login': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  'logout': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

export function AuditLogs() {
  const { currentWorkspace } = useWorkspaceStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'all'>('week');

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 50;

  // Available filters (collected from logs)
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableResources, setAvailableResources] = useState<string[]>([]);

  useEffect(() => {
    loadLogs();
  }, [currentWorkspace?.id, actionFilter, resourceFilter, userFilter, dateRange]);

  const loadLogs = async () => {
    if (!currentWorkspace?.id) return;

    setIsLoading(true);
    setError('');

    try {
      // Calculate date range
      let startDate: Date | undefined;
      const now = new Date();
      switch (dateRange) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const response = await apiService.getWorkspaceAuditLogs(currentWorkspace.id, {
        limit,
        offset: (page - 1) * limit,
        action: actionFilter || undefined,
        resource: resourceFilter || undefined,
        userId: userFilter || undefined,
        startDate,
      });

      setLogs(response.logs || response);
      setHasMore((response.logs || response).length === limit);

      // Extract unique actions and resources for filters
      const logData = response.logs || response;
      const actions = [...new Set(logData.map((l: AuditLog) => l.action))] as string[];
      const resources = [...new Set(logData.map((l: AuditLog) => l.resource))] as string[];
      setAvailableActions(actions);
      setAvailableResources(resources);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
      // If endpoint doesn't exist, show demo data
      if (err.response?.status === 404) {
        setLogs(generateDemoLogs());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateDemoLogs = (): AuditLog[] => {
    const actions = ['create', 'update', 'delete', 'deploy', 'login'];
    const resources = ['project', 'service', 'deployment', 'user', 'workspace'];
    return Array.from({ length: 20 }, (_, i) => ({
      id: `demo-${i}`,
      userId: 'demo-user',
      action: actions[Math.floor(Math.random() * actions.length)],
      resource: resources[Math.floor(Math.random() * resources.length)],
      resourceId: `resource-${i}`,
      metadata: { demo: true },
      ipAddress: '127.0.0.1',
      userAgent: 'Demo Browser',
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      user: {
        id: 'demo-user',
        email: 'demo@kubidu.io',
        name: 'Demo User',
        avatarUrl: null,
      },
    }));
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Resource ID', 'IP Address', 'Details'];
    const rows = logs.map(log => [
      new Date(log.createdAt).toISOString(),
      log.user?.email || log.userId || 'System',
      log.action,
      log.resource,
      log.resourceId || '',
      log.ipAddress || '',
      log.metadata ? JSON.stringify(log.metadata) : '',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionColor = (action: string) => {
    const baseAction = action.split('.')[0].toLowerCase();
    return ACTION_COLORS[baseAction] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getActionIcon = (action: string) => {
    const baseAction = action.split('.')[0].toLowerCase();
    return ACTION_ICONS[baseAction] || '📋';
  };

  const formatAction = (action: string) => {
    return action.replace(/\./g, ' ').replace(/_/g, ' ');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track all actions and changes in your workspace (ISO 27001 compliant)
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="btn btn-secondary flex items-center gap-2"
          disabled={logs.length === 0}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Time Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="input input-sm"
            >
              <option value="day">Last 24 hours</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="input input-sm"
            >
              <option value="">All actions</option>
              {availableActions.map(action => (
                <option key={action} value={action}>{formatAction(action)}</option>
              ))}
            </select>
          </div>

          {/* Resource Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Resource
            </label>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="input input-sm"
            >
              <option value="">All resources</option>
              {availableResources.map(resource => (
                <option key={resource} value={resource}>{resource}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(actionFilter || resourceFilter || userFilter) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setActionFilter('');
                  setResourceFilter('');
                  setUserFilter('');
                }}
                className="btn btn-sm btn-ghost text-gray-500"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="alert alert-error mb-6">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="spinner spinner-lg" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && logs.length === 0 && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No audit logs found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {actionFilter || resourceFilter ? 'Try adjusting your filters' : 'Actions will appear here once you start using Kubidu'}
          </p>
        </div>
      )}

      {/* Logs Table */}
      {!isLoading && logs.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {format(new Date(log.createdAt), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(log.createdAt), 'HH:mm:ss')}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-medium">
                          {(log.user?.name || log.user?.email || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.user?.name || 'System'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {log.user?.email || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        <span>{getActionIcon(log.action)}</span>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white capitalize">
                        {log.resource}
                      </div>
                      {log.resourceId && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {log.resourceId.substring(0, 8)}...
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                            View details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto max-w-xs">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {hasMore && (
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-center">
              <button
                onClick={() => setPage(p => p + 1)}
                className="btn btn-secondary btn-sm"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          Audit logs are retained for 90 days. For longer retention, please export to CSV.
        </p>
        <p className="mt-1">
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            ISO 27001 Compliant
          </span>
        </p>
      </div>
    </div>
  );
}
