import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiService } from '../services/api.service';

interface ServiceStatus {
  id: string;
  name: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  lastDeploymentAt: string | null;
  responseTime: number | null;
}

interface UptimeDay {
  date: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  uptime: number;
}

interface Incident {
  id: string;
  title: string;
  message: string;
  status: string;
  severity: string;
  createdAt: string;
  resolvedAt: string | null;
}

interface StatusData {
  project: { id: string; name: string; slug: string };
  workspace: { name: string; slug: string };
  overallStatus: 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
  uptimePercentage: number;
  services: ServiceStatus[];
  uptimeData: UptimeDay[];
  incidents: Incident[];
  lastUpdated: string;
}

export function StatusPage() {
  const { workspaceSlug, projectSlug } = useParams<{ 
    workspaceSlug: string; 
    projectSlug: string; 
  }>();
  const [email, setEmail] = useState('');
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);

  const { data: statusData, isLoading, error, refetch } = useQuery<StatusData>({
    queryKey: ['status', workspaceSlug, projectSlug],
    queryFn: () => apiService.getPublicStatus(workspaceSlug!, projectSlug!),
    enabled: !!workspaceSlug && !!projectSlug,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const subscribeMutation = useMutation({
    mutationFn: (email: string) => 
      apiService.subscribeToStatus(workspaceSlug!, projectSlug!, email),
    onSuccess: () => {
      setSubscribeSuccess(true);
      setEmail('');
    },
  });

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => refetch(), 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <span className="text-gray-500 dark:text-gray-400">Loading status...</span>
        </div>
      </div>
    );
  }

  if (error || !statusData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Status Page Not Found
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            The project you're looking for doesn't exist or isn't public.
          </p>
        </div>
      </div>
    );
  }

  const statusConfig = {
    operational: {
      bg: 'bg-green-500',
      text: 'text-green-700 dark:text-green-300',
      bgLight: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      label: 'All Systems Operational',
      emoji: '✅',
    },
    degraded: {
      bg: 'bg-yellow-500',
      text: 'text-yellow-700 dark:text-yellow-300',
      bgLight: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      label: 'Degraded Performance',
      emoji: '⚠️',
    },
    partial_outage: {
      bg: 'bg-orange-500',
      text: 'text-orange-700 dark:text-orange-300',
      bgLight: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      label: 'Partial Outage',
      emoji: '🔶',
    },
    major_outage: {
      bg: 'bg-red-500',
      text: 'text-red-700 dark:text-red-300',
      bgLight: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      label: 'Major Outage',
      emoji: '🔴',
    },
  };

  const status = statusConfig[statusData.overallStatus];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
              {statusData.project.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {statusData.project.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {statusData.workspace.name} • Status Page
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Overall Status Banner */}
        <div className={`rounded-2xl p-6 mb-8 ${status.bgLight} ${status.border} border`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${status.bg} animate-pulse`} />
              <div>
                <h2 className={`text-xl font-bold ${status.text}`}>
                  {status.emoji} {status.label}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Last updated: {new Date(statusData.lastUpdated).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {statusData.uptimePercentage.toFixed(2)}%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Uptime (30 days)
              </p>
            </div>
          </div>
        </div>

        {/* Uptime Timeline */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            📊 Uptime History (Last 30 Days)
          </h3>
          <div className="flex gap-1">
            {statusData.uptimeData.map((day, i) => {
              const color = day.status === 'UP' 
                ? 'bg-green-500' 
                : day.status === 'DEGRADED' 
                  ? 'bg-yellow-500' 
                  : 'bg-red-500';
              
              return (
                <div
                  key={day.date}
                  className="group relative flex-1"
                >
                  <div
                    className={`h-8 rounded-sm ${color} hover:opacity-80 transition-opacity cursor-pointer`}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {day.date}: {day.uptime.toFixed(1)}% uptime
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{statusData.uptimeData[0]?.date}</span>
            <span>Today</span>
          </div>
        </div>

        {/* Services List */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              ⚙️ Services
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {statusData.services.map((service) => {
              const serviceStatus = {
                UP: {
                  bg: 'bg-green-500',
                  text: 'text-green-700 dark:text-green-300',
                  label: 'Operational',
                },
                DOWN: {
                  bg: 'bg-red-500',
                  text: 'text-red-700 dark:text-red-300',
                  label: 'Down',
                },
                DEGRADED: {
                  bg: 'bg-yellow-500',
                  text: 'text-yellow-700 dark:text-yellow-300',
                  label: 'Degraded',
                },
              }[service.status];

              return (
                <div
                  key={service.id}
                  className="px-6 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${serviceStatus.bg}`} />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {service.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {service.responseTime && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {service.responseTime}ms
                      </span>
                    )}
                    <span className={`text-sm font-medium ${serviceStatus.text}`}>
                      {serviceStatus.label}
                    </span>
                  </div>
                </div>
              );
            })}
            {statusData.services.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                No services configured
              </div>
            )}
          </div>
        </div>

        {/* Incidents */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              📝 Recent Incidents
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {statusData.incidents.length > 0 ? (
              statusData.incidents.map((incident) => {
                const severityColors = {
                  MINOR: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
                  MAJOR: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
                  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                };

                return (
                  <div key={incident.id} className="px-6 py-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {incident.title}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[incident.severity as keyof typeof severityColors] || severityColors.MINOR}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {incident.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        Started: {new Date(incident.createdAt).toLocaleString()}
                      </span>
                      {incident.resolvedAt && (
                        <span className="text-green-600 dark:text-green-400">
                          ✓ Resolved: {new Date(incident.resolvedAt).toLocaleString()}
                        </span>
                      )}
                      {!incident.resolvedAt && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Status: {incident.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-8 text-center">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-gray-500 dark:text-gray-400">
                  No incidents reported
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Subscribe Form */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            🔔 Subscribe to Updates
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Get notified when there's a status change or incident.
          </p>
          
          {subscribeSuccess ? (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-green-700 dark:text-green-300 text-sm">
                ✅ Check your email to confirm your subscription!
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email) subscribeMutation.mutate(email);
              }}
              className="flex gap-2"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="submit"
                disabled={subscribeMutation.isPending}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {subscribeMutation.isPending ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          )}
          
          {subscribeMutation.isError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              Failed to subscribe. Please try again.
            </p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Powered by Kubidu</span>
          <span>Auto-refreshes every 30 seconds</span>
        </div>
      </footer>
    </div>
  );
}
