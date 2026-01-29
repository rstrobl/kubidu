import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiService } from '../services/api.service';
import { AddServiceModal } from '../components/AddServiceModal';
import { ServiceDetailModal } from '../components/ServiceDetailModal';

type DisplayStatus = 'running' | 'in-progress' | 'failed' | 'stopped';

function getServiceDisplayStatus(service: any): { label: string; dotClass: string; textClass: string; status: DisplayStatus } {
  const deployments: any[] = service.deployments || [];
  if (deployments.length === 0) {
    return { label: 'Stopped', dotClass: 'bg-gray-400', textClass: 'text-gray-600', status: 'stopped' };
  }

  const active = deployments.find((d: any) => d.isActive);
  const latest = active || [...deployments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  switch (latest.status) {
    case 'RUNNING':
      return { label: 'Running', dotClass: 'bg-green-500 animate-pulse', textClass: 'text-green-700', status: 'running' };
    case 'PENDING':
    case 'BUILDING':
    case 'DEPLOYING':
      return { label: 'In Progress', dotClass: 'bg-yellow-500 animate-pulse', textClass: 'text-yellow-700', status: 'in-progress' };
    case 'FAILED':
    case 'CRASHED':
      return { label: 'Failed', dotClass: 'bg-red-500', textClass: 'text-red-700', status: 'failed' };
    case 'STOPPED':
    default:
      return { label: 'Stopped', dotClass: 'bg-gray-400', textClass: 'text-gray-600', status: 'stopped' };
  }
}

const POLL_INTERVAL_MS = 5000;

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const selectedServiceId = searchParams.get('service');
  const initialTab = searchParams.get('tab') as 'overview' | 'settings' | 'env' | 'domains' | 'deployments' | null;
  const setSelectedServiceId = (serviceId: string | null) => {
    setSearchParams(prev => {
      if (serviceId) {
        prev.set('service', serviceId);
      } else {
        prev.delete('service');
        prev.delete('tab');
      }
      return prev;
    }, { replace: true });
  };
  const isModalOpen = isAddServiceModalOpen || !!selectedServiceId;
  const isModalOpenRef = useRef(isModalOpen);
  isModalOpenRef.current = isModalOpen;

  const loadProject = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getProject(id!);
      setProject(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id, loadProject]);

  // Poll for project updates
  useEffect(() => {
    if (!id) return;

    const interval = setInterval(async () => {
      if (isModalOpenRef.current) return;
      try {
        const data = await apiService.getProject(id);
        setProject(data);
      } catch {
        // Silently ignore polling errors to avoid disruptive UI flicker
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading project...</div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setIsAddServiceModalOpen(true)}
            className="btn btn-primary"
          >
            Add Service
          </button>
        </div>

        {!project.services || project.services.length === 0 ? (
          <div className="card text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No services</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add services to your project (frontend, backend, database, etc.)
            </p>
            <div className="mt-6">
              <button
                onClick={() => setIsAddServiceModalOpen(true)}
                className="btn btn-primary"
              >
                Add Service
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {project.services.map((service: any) => {
              const displayStatus = getServiceDisplayStatus(service);
              const publicDomain = service.url ? new URL(service.url).hostname : null;

              return (
                <div
                  key={service.id}
                  onClick={() => setSelectedServiceId(service.id)}
                  className="card cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {service.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${displayStatus.dotClass}`}></div>
                          <span className={`text-sm ${displayStatus.textClass}`}>
                            {displayStatus.label}
                          </span>
                        </div>
                      </div>
                      {publicDomain && (
                        <div className="mt-2 text-sm text-gray-500 font-mono">
                          {publicDomain}
                        </div>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Service Modal */}
      <AddServiceModal
        projectId={id!}
        isOpen={isAddServiceModalOpen}
        onClose={() => setIsAddServiceModalOpen(false)}
        onSuccess={loadProject}
      />

      {/* Service Detail Modal */}
      {selectedServiceId && (
        <ServiceDetailModal
          projectId={id!}
          serviceId={selectedServiceId}
          isOpen={!!selectedServiceId}
          onClose={() => setSelectedServiceId(null)}
          onServiceUpdated={loadProject}
          initialTab={initialTab || undefined}
          onTabChange={(tab) => {
            setSearchParams(prev => {
              prev.set('tab', tab);
              return prev;
            }, { replace: true });
          }}
        />
      )}

    </div>
  );
}
