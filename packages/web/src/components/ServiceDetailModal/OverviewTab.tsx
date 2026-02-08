import { Service } from './types';

interface OverviewTabProps {
  service: Service;
}

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
            <label className="block text-sm font-medium text-gray-500">Default Port</label>
            <p className="mt-1 text-sm text-gray-900">{service.defaultPort}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500">Default Replicas</label>
            <p className="mt-1 text-sm text-gray-900">{service.defaultReplicas}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Resource Limits</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">CPU Limit</label>
            <p className="mt-1 text-sm text-gray-900">{service.defaultCpuLimit}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500">Memory Limit</label>
            <p className="mt-1 text-sm text-gray-900">{service.defaultMemoryLimit}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500">CPU Request</label>
            <p className="mt-1 text-sm text-gray-900">{service.defaultCpuRequest}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500">Memory Request</label>
            <p className="mt-1 text-sm text-gray-900">{service.defaultMemoryRequest}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500">Health Check Path</label>
            <p className="mt-1 text-sm text-gray-900">{service.defaultHealthCheckPath}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
