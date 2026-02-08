import { useState, useEffect } from 'react';

interface ResourceLimitsProps {
  cpuLimit: string;
  memoryLimit: string;
  cpuRequest: string;
  memoryRequest: string;
  replicas: number;
  onChange: (values: {
    cpuLimit: string;
    memoryLimit: string;
    cpuRequest: string;
    memoryRequest: string;
    replicas: number;
  }) => void;
  usageData?: {
    cpuUsage: number; // millicores
    memoryUsage: number; // MB
  };
  planLimits?: {
    maxCpu: number; // cores
    maxMemory: number; // GB
    maxReplicas: number;
  };
  disabled?: boolean;
}

// CPU presets in millicores
const CPU_PRESETS = [
  { value: '100m', label: '0.1 CPU', millicores: 100 },
  { value: '250m', label: '0.25 CPU', millicores: 250 },
  { value: '500m', label: '0.5 CPU', millicores: 500 },
  { value: '1000m', label: '1 CPU', millicores: 1000 },
  { value: '2000m', label: '2 CPU', millicores: 2000 },
  { value: '4000m', label: '4 CPU', millicores: 4000 },
];

// Memory presets in MB
const MEMORY_PRESETS = [
  { value: '128Mi', label: '128 MB', mb: 128 },
  { value: '256Mi', label: '256 MB', mb: 256 },
  { value: '512Mi', label: '512 MB', mb: 512 },
  { value: '1Gi', label: '1 GB', mb: 1024 },
  { value: '2Gi', label: '2 GB', mb: 2048 },
  { value: '4Gi', label: '4 GB', mb: 4096 },
  { value: '8Gi', label: '8 GB', mb: 8192 },
];

function parseCpu(value: string): number {
  if (value.endsWith('m')) {
    return parseInt(value);
  }
  return parseFloat(value) * 1000;
}

function parseMemory(value: string): number {
  if (value.endsWith('Mi')) {
    return parseInt(value);
  }
  if (value.endsWith('Gi')) {
    return parseInt(value) * 1024;
  }
  return parseInt(value);
}

export function ResourceLimits({
  cpuLimit,
  memoryLimit,
  cpuRequest,
  memoryRequest,
  replicas,
  onChange,
  usageData,
  planLimits = { maxCpu: 4, maxMemory: 8, maxReplicas: 10 },
  disabled = false,
}: ResourceLimitsProps) {
  const [localCpuLimit, setLocalCpuLimit] = useState(cpuLimit);
  const [localMemoryLimit, setLocalMemoryLimit] = useState(memoryLimit);
  const [localReplicas, setLocalReplicas] = useState(replicas);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localCpuRequest, setLocalCpuRequest] = useState(cpuRequest);
  const [localMemoryRequest, setLocalMemoryRequest] = useState(memoryRequest);

  useEffect(() => {
    setLocalCpuLimit(cpuLimit);
    setLocalMemoryLimit(memoryLimit);
    setLocalCpuRequest(cpuRequest);
    setLocalMemoryRequest(memoryRequest);
    setLocalReplicas(replicas);
  }, [cpuLimit, memoryLimit, cpuRequest, memoryRequest, replicas]);

  const handleChange = () => {
    onChange({
      cpuLimit: localCpuLimit,
      memoryLimit: localMemoryLimit,
      cpuRequest: localCpuRequest,
      memoryRequest: localMemoryRequest,
      replicas: localReplicas,
    });
  };

  const cpuLimitMillicores = parseCpu(localCpuLimit);
  const memoryLimitMb = parseMemory(localMemoryLimit);

  // Check if exceeding plan limits
  const totalCpuCores = (cpuLimitMillicores * localReplicas) / 1000;
  const totalMemoryGb = (memoryLimitMb * localReplicas) / 1024;
  const exceedsCpu = totalCpuCores > planLimits.maxCpu;
  const exceedsMemory = totalMemoryGb > planLimits.maxMemory;
  const exceedsReplicas = localReplicas > planLimits.maxReplicas;

  // Calculate recommendations based on usage
  const getRecommendation = () => {
    if (!usageData) return null;

    const recommendations: string[] = [];

    // CPU recommendation
    const cpuUsagePercent = (usageData.cpuUsage / cpuLimitMillicores) * 100;
    if (cpuUsagePercent > 80) {
      recommendations.push('Consider increasing CPU limit - usage is over 80%');
    } else if (cpuUsagePercent < 20 && cpuLimitMillicores > 100) {
      recommendations.push('CPU limit might be too high - usage is under 20%');
    }

    // Memory recommendation
    const memoryUsagePercent = (usageData.memoryUsage / memoryLimitMb) * 100;
    if (memoryUsagePercent > 80) {
      recommendations.push('Consider increasing memory limit - usage is over 80%');
    } else if (memoryUsagePercent < 20 && memoryLimitMb > 128) {
      recommendations.push('Memory limit might be too high - usage is under 20%');
    }

    return recommendations.length > 0 ? recommendations : null;
  };

  const recommendations = getRecommendation();

  return (
    <div className="space-y-6">
      {/* Warnings */}
      {(exceedsCpu || exceedsMemory || exceedsReplicas) && (
        <div className="alert alert-warning">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium">Resource limits exceeded</p>
            <ul className="text-sm mt-1">
              {exceedsCpu && (
                <li>Total CPU ({totalCpuCores.toFixed(1)} cores) exceeds plan limit ({planLimits.maxCpu} cores)</li>
              )}
              {exceedsMemory && (
                <li>Total memory ({totalMemoryGb.toFixed(1)} GB) exceeds plan limit ({planLimits.maxMemory} GB)</li>
              )}
              {exceedsReplicas && (
                <li>Replicas ({localReplicas}) exceeds plan limit ({planLimits.maxReplicas})</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">Recommendations</p>
              <ul className="text-sm text-blue-600 dark:text-blue-400 mt-1 space-y-1">
                {recommendations.map((rec, i) => (
                  <li key={i}>• {rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* CPU Limit */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          CPU Limit
          {usageData && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              Current usage: {usageData.cpuUsage}m ({((usageData.cpuUsage / cpuLimitMillicores) * 100).toFixed(0)}%)
            </span>
          )}
        </label>
        <div className="relative">
          <input
            type="range"
            min={0}
            max={CPU_PRESETS.length - 1}
            value={CPU_PRESETS.findIndex(p => p.value === localCpuLimit) || 2}
            onChange={(e) => {
              const preset = CPU_PRESETS[parseInt(e.target.value)];
              setLocalCpuLimit(preset.value);
            }}
            onMouseUp={handleChange}
            onTouchEnd={handleChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600 disabled:cursor-not-allowed"
            disabled={disabled}
          />
          <div className="flex justify-between mt-2">
            {CPU_PRESETS.map((preset, i) => (
              <span
                key={preset.value}
                className={`text-xs ${
                  CPU_PRESETS.findIndex(p => p.value === localCpuLimit) === i
                    ? 'text-primary-600 font-medium'
                    : 'text-gray-400'
                }`}
              >
                {preset.label}
              </span>
            ))}
          </div>
          {usageData && (
            <div
              className="absolute top-0 h-2 bg-green-500 rounded-l-lg opacity-50 pointer-events-none"
              style={{ width: `${Math.min((usageData.cpuUsage / CPU_PRESETS[CPU_PRESETS.length - 1].millicores) * 100, 100)}%` }}
            />
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Selected: <strong>{CPU_PRESETS.find(p => p.value === localCpuLimit)?.label || localCpuLimit}</strong>
        </p>
      </div>

      {/* Memory Limit */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Memory Limit
          {usageData && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              Current usage: {usageData.memoryUsage} MB ({((usageData.memoryUsage / memoryLimitMb) * 100).toFixed(0)}%)
            </span>
          )}
        </label>
        <div className="relative">
          <input
            type="range"
            min={0}
            max={MEMORY_PRESETS.length - 1}
            value={MEMORY_PRESETS.findIndex(p => p.value === localMemoryLimit) || 2}
            onChange={(e) => {
              const preset = MEMORY_PRESETS[parseInt(e.target.value)];
              setLocalMemoryLimit(preset.value);
            }}
            onMouseUp={handleChange}
            onTouchEnd={handleChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600 disabled:cursor-not-allowed"
            disabled={disabled}
          />
          <div className="flex justify-between mt-2">
            {MEMORY_PRESETS.map((preset, i) => (
              <span
                key={preset.value}
                className={`text-xs ${
                  MEMORY_PRESETS.findIndex(p => p.value === localMemoryLimit) === i
                    ? 'text-primary-600 font-medium'
                    : 'text-gray-400'
                }`}
              >
                {preset.label}
              </span>
            ))}
          </div>
          {usageData && (
            <div
              className="absolute top-0 h-2 bg-green-500 rounded-l-lg opacity-50 pointer-events-none"
              style={{ width: `${Math.min((usageData.memoryUsage / MEMORY_PRESETS[MEMORY_PRESETS.length - 1].mb) * 100, 100)}%` }}
            />
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Selected: <strong>{MEMORY_PRESETS.find(p => p.value === localMemoryLimit)?.label || localMemoryLimit}</strong>
        </p>
      </div>

      {/* Replicas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Replicas
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={planLimits.maxReplicas}
            value={localReplicas}
            onChange={(e) => setLocalReplicas(parseInt(e.target.value))}
            onMouseUp={handleChange}
            onTouchEnd={handleChange}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600 disabled:cursor-not-allowed"
            disabled={disabled}
          />
          <span className="w-12 text-center text-lg font-semibold text-gray-900 dark:text-white">
            {localReplicas}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Higher replica count improves availability and handles more traffic
        </p>
      </div>

      {/* Resource Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Total Resources</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className={`text-xl font-bold ${exceedsCpu ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
              {totalCpuCores.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500">CPU Cores</p>
          </div>
          <div>
            <p className={`text-xl font-bold ${exceedsMemory ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
              {totalMemoryGb.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500">GB Memory</p>
          </div>
          <div>
            <p className={`text-xl font-bold ${exceedsReplicas ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
              {localReplicas}
            </p>
            <p className="text-xs text-gray-500">Replicas</p>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Advanced Settings
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CPU Request
              </label>
              <select
                value={localCpuRequest}
                onChange={(e) => {
                  setLocalCpuRequest(e.target.value);
                  setTimeout(handleChange, 0);
                }}
                className="input w-full"
                disabled={disabled}
              >
                {CPU_PRESETS.filter(p => parseCpu(p.value) <= cpuLimitMillicores).map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Guaranteed CPU allocation (should be ≤ limit)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Memory Request
              </label>
              <select
                value={localMemoryRequest}
                onChange={(e) => {
                  setLocalMemoryRequest(e.target.value);
                  setTimeout(handleChange, 0);
                }}
                className="input w-full"
                disabled={disabled}
              >
                {MEMORY_PRESETS.filter(p => parseMemory(p.value) <= memoryLimitMb).map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Guaranteed memory allocation (should be ≤ limit)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
