import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { apiService } from '../services/api.service';
import { AddServiceModal } from '../components/AddServiceModal';
import { ServiceDetailModal } from '../components/ServiceDetailModal';
import { ServiceCanvas } from '../components/ServiceCanvas';

const POLL_INTERVAL_MS = 5000;

function LoadingSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <span className="text-gray-500">Loading project...</span>
      </div>
    </div>
  );
}

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
    return <LoadingSkeleton />;
  }

  if (error && !project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="alert alert-error">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="font-medium">Failed to load project</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
          <button onClick={loadProject} className="btn btn-sm btn-secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="fixed inset-0 top-16 flex flex-col animate-fade-in">
      <div className="flex-1 relative">
        {!project.services || project.services.length === 0 ? (
          /* Empty state */
          <div className="h-full flex items-center justify-center p-8">
            <div className="card max-w-2xl w-full text-center py-12 px-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Add your first service
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Services are the building blocks of your project. Add a web app, API, database, or worker to get started.
              </p>
              
              <button
                onClick={() => setIsAddServiceModalOpen(true)}
                className="btn btn-primary btn-lg"
              >
                <svg className="w-5 h-5 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Service
              </button>

              {/* Service types preview */}
              <div className="mt-12 grid sm:grid-cols-3 gap-4 text-left">
                {[
                  { icon: '🌐', title: 'Web App', desc: 'Frontend or full-stack app' },
                  { icon: '⚙️', title: 'API / Backend', desc: 'REST, GraphQL, or gRPC' },
                  { icon: '🗄️', title: 'Database', desc: 'PostgreSQL, Redis, etc.' },
                ].map((type, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-gray-50">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{type.title}</div>
                      <div className="text-sm text-gray-500">{type.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative h-full">
            {/* Floating action button */}
            <div className="absolute top-3 z-10 right-0 w-full max-w-7xl left-1/2 -translate-x-1/2 flex justify-end px-4 sm:px-6 lg:px-8 pointer-events-none">
              <button
                onClick={() => setIsAddServiceModalOpen(true)}
                className="btn btn-primary shadow-lg shadow-primary-600/25 pointer-events-auto"
              >
                <svg className="w-5 h-5 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Service
              </button>
            </div>
            <ServiceCanvas
              projectId={id!}
              services={project.services}
              onServiceSelect={(serviceId) => setSelectedServiceId(serviceId)}
              onServicesDeleted={loadProject}
            />
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
