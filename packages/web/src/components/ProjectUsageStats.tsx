import { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api.service';
import { UsageProgressBar } from './UsageProgressBar';
import {
  formatCpuMillicores,
  formatMemoryBytes,
  ProjectAllocationStats,
  ProjectLiveMetrics,
} from '@kubidu/shared';

interface ProjectUsageStatsProps {
  projectId: string;
}

export function ProjectUsageStats({ projectId }: ProjectUsageStatsProps) {
  const [stats, setStats] = useState<ProjectAllocationStats | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<ProjectLiveMetrics | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load allocation stats
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        const data = await apiService.getProjectStats(projectId);
        if (!cancelled) setStats(data);
      } catch (err: any) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load stats');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [projectId]);

  // Poll live metrics when details are expanded
  useEffect(() => {
    if (!showDetails) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    async function fetchLive() {
      try {
        const data = await apiService.getProjectLiveMetrics(projectId);
        setLiveMetrics(data);
      } catch {
        // Silently ignore - live metrics are best-effort
      }
    }

    fetchLive();
    pollRef.current = setInterval(fetchLive, 15000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [showDetails, projectId]);

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Usage &amp; Resources</h2>
        <div className="card p-6">
          <div className="text-gray-500">Loading stats...</div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return null;
  }

  const cpuLimitMillicores = stats.plan.limits.maxCpuCores === -1
    ? -1
    : stats.plan.limits.maxCpuCores * 1000;
  const memoryLimitBytes = stats.plan.limits.maxMemoryGb === -1
    ? -1
    : stats.plan.limits.maxMemoryGb * 1024 * 1024 * 1024;

  const cpuPercent = cpuLimitMillicores === -1
    ? 0
    : cpuLimitMillicores > 0 ? (stats.allocatedCpuMillicores / cpuLimitMillicores) * 100 : 0;
  const memoryPercent = memoryLimitBytes === -1
    ? 0
    : memoryLimitBytes > 0 ? (stats.allocatedMemoryBytes / memoryLimitBytes) * 100 : 0;
  const buildPercent = stats.plan.limits.buildMinutesPerMonth === -1
    ? 0
    : stats.plan.limits.buildMinutesPerMonth > 0
      ? (stats.buildMinutesUsed / stats.plan.limits.buildMinutesPerMonth) * 100
      : 0;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Usage &amp; Resources</h2>
      <div className="card p-6">
        {/* Summary stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.serviceCount}</div>
            <div className="text-sm text-gray-500">Services</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.activeDeploymentCount}</div>
            <div className="text-sm text-gray-500">Active Deployments</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.buildMinutesUsed}</div>
            <div className="text-sm text-gray-500">Build Minutes</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary-600 font-semibold">{stats.plan.name}</div>
            <div className="text-sm text-gray-500">Plan</div>
          </div>
        </div>

        {/* Progress bars */}
        <div className="space-y-4">
          <UsageProgressBar
            label="CPU Allocated"
            used={formatCpuMillicores(stats.allocatedCpuMillicores)}
            limit={cpuLimitMillicores === -1 ? '' : formatCpuMillicores(cpuLimitMillicores)}
            percentage={cpuPercent}
            unlimited={cpuLimitMillicores === -1}
          />
          <UsageProgressBar
            label="Memory Allocated"
            used={formatMemoryBytes(stats.allocatedMemoryBytes)}
            limit={memoryLimitBytes === -1 ? '' : formatMemoryBytes(memoryLimitBytes)}
            percentage={memoryPercent}
            unlimited={memoryLimitBytes === -1}
          />
          <UsageProgressBar
            label="Build Minutes"
            used={`${stats.buildMinutesUsed} min`}
            limit={stats.plan.limits.buildMinutesPerMonth === -1 ? '' : `${stats.plan.limits.buildMinutesPerMonth} min`}
            percentage={buildPercent}
            unlimited={stats.plan.limits.buildMinutesPerMonth === -1}
          />
        </div>

        {/* Expandable details */}
        <div className="mt-4 border-t pt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <svg
              className={`w-4 h-4 mr-1 transition-transform ${showDetails ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>

          {showDetails && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Live Metrics per Deployment</h3>
              {!liveMetrics ? (
                <div className="text-sm text-gray-500">Loading live metrics...</div>
              ) : liveMetrics.deployments.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No running deployments with available metrics.
                </div>
              ) : (
                <div className="space-y-4">
                  {liveMetrics.deployments.map((d) => {
                    const cpuPct = d.cpuLimitMillicores > 0
                      ? (d.cpuUsageMillicores / d.cpuLimitMillicores) * 100
                      : 0;
                    const memPct = d.memoryLimitBytes > 0
                      ? (d.memoryUsageBytes / d.memoryLimitBytes) * 100
                      : 0;

                    return (
                      <div key={d.deploymentId} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">{d.serviceName}</span>
                          <span className="text-xs text-gray-500">{d.podCount} pod{d.podCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="space-y-2">
                          <UsageProgressBar
                            label="CPU"
                            used={formatCpuMillicores(d.cpuUsageMillicores)}
                            limit={formatCpuMillicores(d.cpuLimitMillicores)}
                            percentage={cpuPct}
                          />
                          <UsageProgressBar
                            label="Memory"
                            used={formatMemoryBytes(d.memoryUsageBytes)}
                            limit={formatMemoryBytes(d.memoryLimitBytes)}
                            percentage={memPct}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div className="bg-blue-50 rounded-lg p-3 mt-2">
                    <div className="text-sm font-medium text-blue-900 mb-1">Total Live Usage</div>
                    <div className="text-sm text-blue-700">
                      CPU: {formatCpuMillicores(liveMetrics.totalCpuUsageMillicores)} |
                      Memory: {formatMemoryBytes(liveMetrics.totalMemoryUsageBytes)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
