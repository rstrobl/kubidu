import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api.service';

const SERVICE_COLORS = [
  'text-cyan-400',
  'text-yellow-400',
  'text-pink-400',
  'text-emerald-400',
  'text-orange-400',
  'text-violet-400',
  'text-blue-400',
  'text-red-400',
];

const MAX_LINES = 5000;

interface ParsedLogLine {
  timestamp: Date | null;
  timestampRaw: string;
  serviceName: string;
  colorClass: string;
  text: string;
}

interface ActiveDeployment {
  deploymentId: string;
  serviceName: string;
  colorClass: string;
  fallbackLogs: string;
}

const TIMESTAMP_REGEX = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s/;

function parseLogLines(
  rawLogs: string,
  serviceName: string,
  colorClass: string,
): ParsedLogLine[] {
  if (!rawLogs) return [];
  const lines = rawLogs.split('\n');
  const parsed: ParsedLogLine[] = [];
  const now = new Date();
  for (const line of lines) {
    if (!line) continue;
    const match = line.match(TIMESTAMP_REGEX);
    if (match) {
      parsed.push({
        timestamp: new Date(match[1]),
        timestampRaw: match[1],
        serviceName,
        colorClass,
        text: line.slice(match[0].length),
      });
    } else {
      parsed.push({
        timestamp: now,
        timestampRaw: '',
        serviceName,
        colorClass,
        text: line,
      });
    }
  }
  return parsed;
}

function mergeLogLines(allLines: ParsedLogLine[]): ParsedLogLine[] {
  const timestamped = allLines.filter((l) => l.timestamp !== null);
  const untimed = allLines.filter((l) => l.timestamp === null);

  timestamped.sort(
    (a, b) => (a.timestamp as Date).getTime() - (b.timestamp as Date).getTime(),
  );

  const merged = [...timestamped, ...untimed];

  // Carry forward timestamps to lines that don't have one
  let lastTs: Date | null = null;
  for (const line of merged) {
    if (line.timestamp) {
      lastTs = line.timestamp;
    } else if (lastTs) {
      line.timestamp = lastTs;
    }
  }

  if (merged.length > MAX_LINES) {
    return merged.slice(merged.length - MAX_LINES);
  }
  return merged;
}

function formatTimestamp(ts: Date): string {
  return ts.toISOString().replace('T', ' ').replace('Z', '').slice(0, 23);
}

export function ProjectLogs() {
  const { id } = useParams<{ id: string }>();
  const [activeDeployments, setActiveDeployments] = useState<ActiveDeployment[]>([]);
  const [logLines, setLogLines] = useState<ParsedLogLine[]>([]);
  const [hiddenServices, setHiddenServices] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const rawLogsRef = useRef<Map<string, string>>(new Map());

  const deriveActiveDeployments = useCallback(
    (projectData: any): ActiveDeployment[] => {
      const result: ActiveDeployment[] = [];
      if (!projectData?.services) return result;

      projectData.services.forEach((service: any, idx: number) => {
        if (!service.deployments) return;
        const active = service.deployments.find(
          (d: any) =>
            d.isActive === true &&
            (d.status === 'RUNNING' || d.status === 'DEPLOYING'),
        );
        if (active) {
          result.push({
            deploymentId: active.id,
            serviceName: service.name,
            colorClass: SERVICE_COLORS[idx % SERVICE_COLORS.length],
            fallbackLogs: active.deploymentLogs || '',
          });
        }
      });
      return result;
    },
    [],
  );

  // Rebuild merged log lines from raw logs map
  const rebuildLogLines = useCallback((deployments: ActiveDeployment[]) => {
    const allParsed: ParsedLogLine[] = [];
    for (const dep of deployments) {
      const raw = rawLogsRef.current.get(dep.deploymentId) || '';
      allParsed.push(...parseLogLines(raw, dep.serviceName, dep.colorClass));
    }
    setLogLines(mergeLogLines(allParsed));
  }, []);

  // Load project data
  const loadProject = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiService.getProject(id);
      setError(null);
      const deployments = deriveActiveDeployments(data);
      setActiveDeployments(deployments);

      // Seed raw logs from deployment data for any deployment we haven't fetched yet
      for (const dep of deployments) {
        if (!rawLogsRef.current.has(dep.deploymentId) && dep.fallbackLogs) {
          rawLogsRef.current.set(dep.deploymentId, dep.fallbackLogs);
        }
      }
      if (deployments.length > 0) {
        rebuildLogLines(deployments);
      }

      return deployments;
    } catch (err) {
      setError('Failed to load project');
      console.error('Failed to load project:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [id, deriveActiveDeployments, rebuildLogLines]);

  // Fetch logs for all active deployments
  const fetchLogs = useCallback(
    async (deployments: ActiveDeployment[]) => {
      if (deployments.length === 0) return;

      const results = await Promise.allSettled(
        deployments.map((d) => apiService.getDeploymentLogs(d.deploymentId)),
      );

      let changed = false;
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          const logs = typeof result.value === 'string'
            ? result.value
            : (result.value.logs || '');
          if (!logs) return;
          const depId = deployments[idx].deploymentId;
          const existing = rawLogsRef.current.get(depId);
          if (existing !== logs) {
            rawLogsRef.current.set(depId, logs);
            changed = true;
          }
        }
      });

      if (changed) {
        rebuildLogLines(deployments);
      }
    },
    [rebuildLogLines],
  );

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const deployments = await loadProject();
      if (!cancelled && deployments && deployments.length > 0) {
        await fetchLogs(deployments);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProject, fetchLogs]);

  // Polling: logs every 3s, project every 30s
  useEffect(() => {
    const logInterval = setInterval(async () => {
      if (activeDeployments.length > 0) {
        await fetchLogs(activeDeployments);
      }
    }, 3000);

    const projectInterval = setInterval(async () => {
      await loadProject();
    }, 30000);

    return () => {
      clearInterval(logInterval);
      clearInterval(projectInterval);
    };
  }, [activeDeployments, fetchLogs, loadProject]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logLines, autoScroll]);

  const handleScroll = () => {
    if (!logContainerRef.current) return;
    const el = logContainerRef.current;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const scrollToBottom = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  const toggleService = (serviceName: string) => {
    setHiddenServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceName)) {
        next.delete(serviceName);
      } else {
        next.add(serviceName);
      }
      return next;
    });
  };

  const visibleLines = logLines.filter(
    (line) => !hiddenServices.has(line.serviceName),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to={`/projects/${id}`}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Live Logs</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1 ml-7">
            {activeDeployments.length === 0
              ? 'No active deployments'
              : `${activeDeployments.length} active service${activeDeployments.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Service filter chips */}
      {activeDeployments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {activeDeployments.map((dep) => {
            const isHidden = hiddenServices.has(dep.serviceName);
            return (
              <button
                key={dep.deploymentId}
                onClick={() => toggleService(dep.serviceName)}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  isHidden
                    ? 'bg-gray-100 text-gray-400 border-gray-200'
                    : 'bg-gray-800 border-gray-700 ' + dep.colorClass
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full mr-1.5 ${
                    isHidden ? 'bg-gray-300' : 'bg-current'
                  }`}
                />
                {dep.serviceName}
              </button>
            );
          })}
        </div>
      )}

      {/* Terminal view */}
      {activeDeployments.length === 0 ? (
        <div
          className="flex items-center justify-center bg-gray-900 rounded-lg"
          style={{ height: 'calc(100vh - 14rem)' }}
        >
          <div className="text-center">
            <svg
              className="w-12 h-12 text-gray-500 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-400 text-sm">No active deployments</p>
            <p className="text-gray-500 text-xs mt-1">
              Deploy a service to see logs here
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={logContainerRef}
            onScroll={handleScroll}
            className="overflow-y-auto bg-gray-900 rounded-lg p-4 font-mono text-sm"
            style={{ height: 'calc(100vh - 14rem)' }}
          >
            {visibleLines.length === 0 ? (
              <div className="text-gray-400 text-center mt-8">
                Waiting for logs...
              </div>
            ) : (
              visibleLines.map((line, idx) => (
                <div key={idx} className="flex leading-5">
                  <span className="text-gray-500 flex-shrink-0 select-none whitespace-nowrap mr-3">
                    {line.timestamp ? formatTimestamp(line.timestamp) : ''}
                  </span>
                  <span
                    className={`${line.colorClass} flex-shrink-0 font-semibold select-none whitespace-nowrap mr-3`}
                  >
                    [{line.serviceName}]
                  </span>
                  <span className="text-gray-300 whitespace-pre-wrap break-all">{line.text}</span>
                </div>
              ))
            )}
          </div>

          {/* Scroll to bottom button */}
          {!autoScroll && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-md text-xs font-medium shadow-lg transition-colors"
            >
              Scroll to bottom
            </button>
          )}
        </div>
      )}
    </div>
  );
}
