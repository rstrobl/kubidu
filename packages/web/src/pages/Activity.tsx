import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspace.store';
import { apiService } from '../services/api.service';

interface ActivityEvent {
  id: string;
  type: 'deployment' | 'service' | 'domain' | 'env_var' | 'project' | 'workspace' | 'member';
  action: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  metadata: Record<string, any>;
  resourceId?: string;
  resourceType?: string;
  projectId?: string;
  projectName?: string;
  serviceId?: string;
  serviceName?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  createdAt: string;
}

interface ActivityStats {
  deploymentsByStatus: Record<string, number>;
  dailyDeployments: Array<{ date: string; count: number }>;
  totalDeployments: number;
  successRate: number;
}

const typeFilters = [
  { value: '', label: 'All Activity', icon: '📋' },
  { value: 'deployment', label: 'Deployments', icon: '🚀' },
  { value: 'service', label: 'Services', icon: '⚙️' },
  { value: 'domain', label: 'Domains', icon: '🌐' },
  { value: 'env_var', label: 'Environment', icon: '🔐' },
  { value: 'member', label: 'Team', icon: '👥' },
];

const colorClasses: Record<string, string> = {
  green: 'bg-success-100 text-success-700 border-success-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  blue: 'bg-primary-100 text-primary-700 border-primary-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
};

const dotColorClasses: Record<string, string> = {
  green: 'bg-success-500',
  red: 'bg-red-500',
  blue: 'bg-primary-500',
  yellow: 'bg-yellow-500',
  gray: 'bg-gray-400',
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupByDate(activities: ActivityEvent[]): Map<string, ActivityEvent[]> {
  const groups = new Map<string, ActivityEvent[]>();
  
  activities.forEach((activity) => {
    const date = new Date(activity.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let label: string;
    if (date.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else {
      label = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }
    
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(activity);
  });
  
  return groups;
}

export function Activity() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentWorkspace } = useWorkspaceStore();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [activityRes, statsRes] = await Promise.all([
          apiService.getActivity({
            workspaceId: currentWorkspace.id,
            type: selectedType || undefined,
            limit: 100,
          }),
          apiService.getActivityStats({
            workspaceId: currentWorkspace.id,
            days: 30,
          }),
        ]);
        setActivities(activityRes.activities);
        setStats(statsRes);
      } catch (error) {
        console.error('Failed to fetch activity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentWorkspace, selectedType]);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    if (type) {
      setSearchParams({ type });
    } else {
      setSearchParams({});
    }
  };

  const groupedActivities = groupByDate(activities);

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Select a workspace to view activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">📊</span>
            Activity Feed
          </h1>
          <p className="text-gray-500 mt-1">
            Real-time activity across all your projects
          </p>
        </div>
        <button
          onClick={() => setShowStats(!showStats)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          {showStats ? '📈 Hide Stats' : '📈 Show Stats'}
        </button>
      </div>

      {/* Stats Cards */}
      {showStats && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="text-3xl mb-2">🚀</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalDeployments}
            </div>
            <div className="text-sm text-gray-500">Deployments (30d)</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-success-600">
              {stats.successRate}%
            </div>
            <div className="text-sm text-gray-500">Success Rate</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="text-3xl mb-2">🏃</div>
            <div className="text-2xl font-bold text-primary-600">
              {stats.deploymentsByStatus?.RUNNING || 0}
            </div>
            <div className="text-sm text-gray-500">Running Now</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="text-3xl mb-2">❌</div>
            <div className="text-2xl font-bold text-red-600">
              {(stats.deploymentsByStatus?.FAILED || 0) +
                (stats.deploymentsByStatus?.CRASHED || 0)}
            </div>
            <div className="text-sm text-gray-500">Failed (30d)</div>
          </div>
        </div>
      )}

      {/* Mini Chart */}
      {showStats && stats && stats.dailyDeployments.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            Deployments (Last 30 Days)
          </h3>
          <div className="flex items-end gap-1 h-20">
            {stats.dailyDeployments.slice(-30).map((day, i) => {
              const maxCount = Math.max(
                ...stats.dailyDeployments.map((d) => d.count),
                1,
              );
              const height = (day.count / maxCount) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 bg-primary-500 rounded-t-sm hover:bg-primary-600 transition-colors cursor-pointer group relative"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${day.date}: ${day.count} deployments`}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {day.count} deploys
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {typeFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => handleTypeChange(filter.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              selectedType === filter.value
                ? 'bg-primary-100 text-primary-700 border border-primary-200'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>{filter.icon}</span>
            {filter.label}
          </button>
        ))}
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <span className="text-5xl mb-4">📭</span>
            <h3 className="text-lg font-medium text-gray-900">No activity yet</h3>
            <p className="text-gray-500 mt-1">
              Activity will appear here as you deploy and make changes
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {Array.from(groupedActivities.entries()).map(([date, events]) => (
              <div key={date}>
                <div className="sticky top-0 bg-gray-50 px-5 py-2 border-b border-gray-100">
                  <h3 className="text-sm font-medium text-gray-600">{date}</h3>
                </div>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gray-200" />
                  
                  {events.map((activity) => (
                    <div
                      key={activity.id}
                      className="relative flex gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                    >
                      {/* Timeline dot */}
                      <div className="relative z-10 flex-shrink-0 w-6 h-6 flex items-center justify-center">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            dotColorClasses[activity.color] || dotColorClasses.gray
                          }`}
                        />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{activity.icon}</span>
                              <span className="font-medium text-gray-900">
                                {activity.title}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                  colorClasses[activity.color] || colorClasses.gray
                                }`}
                              >
                                {activity.action}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {activity.description}
                            </p>
                            {activity.projectName && (
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                <Link
                                  to={`/projects/${activity.projectId}`}
                                  className="hover:text-primary-600 transition-colors"
                                >
                                  📁 {activity.projectName}
                                </Link>
                                {activity.serviceName && (
                                  <>
                                    <span>→</span>
                                    <span>⚙️ {activity.serviceName}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 whitespace-nowrap">
                            {formatRelativeTime(activity.createdAt)}
                          </div>
                        </div>
                        
                        {/* Metadata */}
                        {activity.metadata?.gitCommitSha && (
                          <div className="mt-2 flex items-center gap-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600">
                              {activity.metadata.gitCommitSha.slice(0, 7)}
                            </code>
                            {activity.metadata.gitAuthor && (
                              <span className="text-xs text-gray-400">
                                by {activity.metadata.gitAuthor}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
