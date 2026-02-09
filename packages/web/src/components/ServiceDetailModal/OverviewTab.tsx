import { Service } from './types';
import { HelpTooltip } from '../HelpTooltip';

interface OverviewTabProps {
  service: Service;
}

// Helper to explain resource values
const ResourceExplanations = {
  cpu: (value: string) => {
    const m = value?.match(/^(\d+)m$/);
    if (m) {
      const millicores = parseInt(m[1]);
      const cores = millicores / 1000;
      return (
        <span>
          <strong>{millicores}m</strong> = {cores} CPU {cores === 1 ? 'core' : 'cores'}
          <br />
          <span className="text-gray-400 text-xs">
            "m" means millicores. 1000m = 1 full CPU core.
          </span>
        </span>
      );
    }
    // Plain number like "1" or "2"
    const n = parseInt(value);
    if (!isNaN(n)) {
      return `${n} CPU ${n === 1 ? 'core' : 'cores'}`;
    }
    return value;
  },
  memory: (value: string) => {
    const mi = value?.match(/^(\d+)Mi$/);
    if (mi) {
      const mebibytes = parseInt(mi[1]);
      const gb = mebibytes / 1024;
      return (
        <span>
          <strong>{mebibytes}Mi</strong> = {mebibytes} Megabytes ({gb < 1 ? `${(gb * 1024).toFixed(0)}MB` : `${gb.toFixed(1)}GB`})
          <br />
          <span className="text-gray-400 text-xs">
            "Mi" means Mebibytes (≈ Megabytes). 1024Mi = 1Gi = ~1GB.
          </span>
        </span>
      );
    }
    const gi = value?.match(/^(\d+)Gi$/);
    if (gi) {
      const gibibytes = parseInt(gi[1]);
      return (
        <span>
          <strong>{gibibytes}Gi</strong> = {gibibytes} Gigabytes
          <br />
          <span className="text-gray-400 text-xs">
            "Gi" means Gibibytes (≈ Gigabytes).
          </span>
        </span>
      );
    }
    return value;
  },
};

export function OverviewTab({ service }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Subdomain & URL Card */}
      <div className="card bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {service.subdomain ? (
              <>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Your .kubidu.io Domain
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-mono font-semibold text-primary-600">
                    {service.subdomain}
                  </span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                    Auto-assigned
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 mb-2">No subdomain assigned</p>
            )}
            
            {service.url && (
              <div className="mt-3 pt-3 border-t border-primary-200/50">
                <label className="block text-xs font-medium text-gray-500 mb-1">Live URL</label>
                <a
                  href={service.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-mono text-primary-600 hover:text-primary-700 hover:underline break-all"
                >
                  {service.url}
                </a>
              </div>
            )}
            
            {!service.url && service.subdomain && (
              <p className="text-xs text-amber-600 mt-2">
                ⏳ URL will be available after first successful deployment
              </p>
            )}
          </div>
          {service.url && (
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 btn btn-primary"
            >
              Visit Site &rarr;
            </a>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Information</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Name</label>
            <p className="mt-1 text-sm text-gray-900">{service.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500">Type</label>
            <p className="mt-1 text-sm text-gray-900">{service.serviceType}</p>
          </div>

          {service.repositoryUrl && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-500">Repository</label>
                <p className="mt-1 text-sm text-gray-900 truncate">{service.repositoryUrl}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Branch</label>
                <p className="mt-1 text-sm text-gray-900">{service.repositoryBranch || 'main'}</p>
              </div>
            </>
          )}

          {service.dockerImage && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-500">Docker Image</label>
                <p className="mt-1 text-sm text-gray-900">{service.dockerImage}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Tag</label>
                <p className="mt-1 text-sm text-gray-900">{service.dockerTag || 'latest'}</p>
              </div>
            </>
          )}

          {service.templateDeploymentId && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Origin</label>
              <p className="mt-1 text-sm text-gray-900">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  Template
                </span>
              </p>
            </div>
          )}

          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-500">
              Default Port
              <HelpTooltip 
                content="The port your application listens on inside the container. Usually 80, 3000, 8080, etc." 
                title="Port"
              />
            </label>
            <p className="mt-1 text-sm text-gray-900">{service.defaultPort}</p>
          </div>

          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-500">
              Default Replicas
              <HelpTooltip 
                content="Number of copies of your service running at once. More replicas = higher availability and capacity to handle traffic." 
                title="Replicas"
              />
            </label>
            <p className="mt-1 text-sm text-gray-900">{service.defaultReplicas}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Resource Limits</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              CPU Limit
              <HelpTooltip 
                content={ResourceExplanations.cpu(service.defaultCpuLimit)} 
                title="CPU Limit"
              />
            </label>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">{service.defaultCpuLimit}</p>
          </div>

          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              Memory Limit
              <HelpTooltip 
                content={ResourceExplanations.memory(service.defaultMemoryLimit)} 
                title="Memory Limit"
              />
            </label>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">{service.defaultMemoryLimit}</p>
          </div>

          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              CPU Request
              <HelpTooltip 
                content={
                  <span>
                    {ResourceExplanations.cpu(service.defaultCpuRequest)}
                    <br /><br />
                    <span className="text-gray-400 text-xs">
                      <strong>Request</strong> = guaranteed minimum. <strong>Limit</strong> = maximum allowed.
                    </span>
                  </span>
                } 
                title="CPU Request"
              />
            </label>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">{service.defaultCpuRequest}</p>
          </div>

          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              Memory Request
              <HelpTooltip 
                content={
                  <span>
                    {ResourceExplanations.memory(service.defaultMemoryRequest)}
                    <br /><br />
                    <span className="text-gray-400 text-xs">
                      <strong>Request</strong> = guaranteed minimum. <strong>Limit</strong> = maximum allowed.
                    </span>
                  </span>
                } 
                title="Memory Request"
              />
            </label>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">{service.defaultMemoryRequest}</p>
          </div>

          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              Health Check Path
              <HelpTooltip 
                content="The URL path we check to verify your service is healthy. Should return HTTP 200 when working correctly." 
                title="Health Check"
              />
            </label>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">{service.defaultHealthCheckPath}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
