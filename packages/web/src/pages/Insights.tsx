import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../stores/workspace.store';
// import { apiService } from '../services/api.service'; // TODO: Enable when backend is ready

interface BuildInsight {
  serviceId: string;
  serviceName: string;
  projectName: string;
  avgBuildTime: number;
  minBuildTime: number;
  maxBuildTime: number;
  totalBuilds: number;
  successRate: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

interface DeploymentTrend {
  date: string;
  total: number;
  successful: number;
  failed: number;
}

interface InsightsData {
  buildInsights: BuildInsight[];
  deploymentTrends: DeploymentTrend[];
  totals: {
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    avgBuildTime: number;
    avgDeployTime: number;
    totalBuildMinutes: number;
  };
  topServices: Array<{
    serviceName: string;
    projectName: string;
    deployCount: number;
    successRate: number;
  }>;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

function TrendBadge({ trend, percent }: { trend: 'up' | 'down' | 'stable'; percent: number }) {
  const colors = {
    up: 'text-success-600 bg-success-50',
    down: 'text-red-600 bg-red-50',
    stable: 'text-gray-600 bg-gray-50',
  };
  const icons = {
    up: '↑',
    down: '↓',
    stable: '→',
  };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[trend]}`}>
      {icons[trend]} {Math.abs(percent).toFixed(1)}%
    </span>
  );
}

function MiniBarChart({ data, maxValue }: { data: DeploymentTrend[]; maxValue: number }) {
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((day, i) => {
        const successHeight = (day.successful / maxValue) * 100;
        const failedHeight = (day.failed / maxValue) * 100;
        const date = new Date(day.date);
        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col-reverse items-stretch gap-0.5" style={{ height: '100px' }}>
              {failedHeight > 0 && (
                <div
                  className="w-full bg-red-400 rounded-t-sm"
                  style={{ height: `${failedHeight}%` }}
                />
              )}
              {successHeight > 0 && (
                <div
                  className="w-full bg-success-500 rounded-t-sm"
                  style={{ height: `${successHeight}%` }}
                />
              )}
            </div>
            <span className="text-xs text-gray-400">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

function CircularProgress({ value, size = 80, strokeWidth = 8, color = 'primary' }: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: 'primary' | 'success' | 'red';
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  const colorClasses = {
    primary: 'stroke-primary-500',
    success: 'stroke-success-500',
    red: 'stroke-red-500',
  };
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={colorClasses[color]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-lg font-bold text-gray-900">
        {Math.round(value)}%
      </span>
    </div>
  );
}

export function Insights() {
  const { currentWorkspace } = useWorkspaceStore();
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!currentWorkspace) return;

    const fetchInsights = async () => {
      setLoading(true);
      try {
        // Since the backend endpoint might not exist yet, we'll generate mock data
        // In production, this would call: apiService.getDeploymentInsights(currentWorkspace.id, days)
        
        const mockData: InsightsData = {
          totals: {
            totalDeployments: 247,
            successfulDeployments: 218,
            failedDeployments: 29,
            avgBuildTime: 127,
            avgDeployTime: 45,
            totalBuildMinutes: 524,
          },
          deploymentTrends: Array.from({ length: 14 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (13 - i));
            const total = Math.floor(Math.random() * 20) + 5;
            const failed = Math.floor(Math.random() * 3);
            return {
              date: date.toISOString().split('T')[0],
              total,
              successful: total - failed,
              failed,
            };
          }),
          buildInsights: [
            {
              serviceId: '1',
              serviceName: 'api-gateway',
              projectName: 'Production',
              avgBuildTime: 95,
              minBuildTime: 72,
              maxBuildTime: 148,
              totalBuilds: 84,
              successRate: 94,
              trend: 'down',
              trendPercent: 12,
            },
            {
              serviceId: '2',
              serviceName: 'web-frontend',
              projectName: 'Production',
              avgBuildTime: 156,
              minBuildTime: 120,
              maxBuildTime: 210,
              totalBuilds: 62,
              successRate: 89,
              trend: 'up',
              trendPercent: 8,
            },
            {
              serviceId: '3',
              serviceName: 'worker-service',
              projectName: 'Production',
              avgBuildTime: 68,
              minBuildTime: 55,
              maxBuildTime: 95,
              totalBuilds: 45,
              successRate: 97,
              trend: 'stable',
              trendPercent: 2,
            },
          ],
          topServices: [
            { serviceName: 'api-gateway', projectName: 'Production', deployCount: 84, successRate: 94 },
            { serviceName: 'web-frontend', projectName: 'Production', deployCount: 62, successRate: 89 },
            { serviceName: 'worker-service', projectName: 'Production', deployCount: 45, successRate: 97 },
            { serviceName: 'auth-service', projectName: 'Production', deployCount: 28, successRate: 92 },
            { serviceName: 'postgres', projectName: 'Staging', deployCount: 18, successRate: 100 },
          ],
        };
        
        setInsights(mockData);
      } catch (error) {
        console.error('Failed to fetch insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [currentWorkspace, days]);

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Select a workspace to view insights</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No insights data available</p>
      </div>
    );
  }

  const successRate = insights.totals.totalDeployments > 0
    ? (insights.totals.successfulDeployments / insights.totals.totalDeployments) * 100
    : 0;

  const maxDailyDeploys = Math.max(...insights.deploymentTrends.map(d => d.total), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">📈</span>
            Deployment Insights
          </h1>
          <p className="text-gray-500 mt-1">
            Build trends, success rates, and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                days === d
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-sm text-gray-500 mb-2">Total Deployments</div>
          <div className="text-3xl font-bold text-gray-900">
            {insights.totals.totalDeployments}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-sm text-gray-500 mb-2">Success Rate</div>
          <div className="flex items-center gap-3">
            <CircularProgress value={successRate} color="success" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-sm text-gray-500 mb-2">Avg Build Time</div>
          <div className="text-3xl font-bold text-primary-600">
            {formatDuration(insights.totals.avgBuildTime)}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-sm text-gray-500 mb-2">Avg Deploy Time</div>
          <div className="text-3xl font-bold text-gray-900">
            {formatDuration(insights.totals.avgDeployTime)}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-sm text-gray-500 mb-2">Build Minutes</div>
          <div className="text-3xl font-bold text-gray-900">
            {insights.totals.totalBuildMinutes}
          </div>
        </div>
      </div>

      {/* Deployment Trends Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📊</span>
          Deployment Activity (Last 14 Days)
        </h2>
        <MiniBarChart data={insights.deploymentTrends} maxValue={maxDailyDeploys} />
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-success-500 rounded-sm" />
            <span className="text-sm text-gray-600">Successful</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-400 rounded-sm" />
            <span className="text-sm text-gray-600">Failed</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Build Performance by Service */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>⏱️</span>
            Build Performance
          </h2>
          <div className="space-y-4">
            {insights.buildInsights.map((service) => (
              <div key={service.serviceId} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{service.serviceName}</h3>
                    <p className="text-xs text-gray-400">{service.projectName}</p>
                  </div>
                  <TrendBadge trend={service.trend} percent={service.trendPercent} />
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDuration(service.avgBuildTime)}
                    </div>
                    <div className="text-xs text-gray-400">Avg</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-success-600">
                      {formatDuration(service.minBuildTime)}
                    </div>
                    <div className="text-xs text-gray-400">Min</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-red-500">
                      {formatDuration(service.maxBuildTime)}
                    </div>
                    <div className="text-xs text-gray-400">Max</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-primary-600">
                      {service.successRate}%
                    </div>
                    <div className="text-xs text-gray-400">Success</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Deployed Services */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🏆</span>
            Most Deployed Services
          </h2>
          <div className="space-y-3">
            {insights.topServices.map((service, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl"
              >
                <div className="w-8 h-8 flex items-center justify-center bg-primary-100 text-primary-700 rounded-lg font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {service.serviceName}
                  </h3>
                  <p className="text-xs text-gray-400">{service.projectName}</p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {service.deployCount} deploys
                  </div>
                  <div className={`text-xs ${
                    service.successRate >= 95 ? 'text-success-600' :
                    service.successRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {service.successRate}% success
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl p-6 border border-primary-200">
        <h2 className="text-lg font-bold text-primary-900 mb-3 flex items-center gap-2">
          <span>💡</span>
          Optimization Tips
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
            <h3 className="font-medium text-gray-900 mb-1">Cache Dependencies</h3>
            <p className="text-sm text-gray-600">
              Enable build caching to reduce average build times by up to 60%
            </p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
            <h3 className="font-medium text-gray-900 mb-1">Parallel Builds</h3>
            <p className="text-sm text-gray-600">
              Deploy multiple services simultaneously with parallel execution
            </p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
            <h3 className="font-medium text-gray-900 mb-1">Health Checks</h3>
            <p className="text-sm text-gray-600">
              Configure proper health checks to catch failures early
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
