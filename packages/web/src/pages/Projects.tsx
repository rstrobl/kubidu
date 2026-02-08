import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '../services/api.service';
import { useWorkspaceStore } from '../stores/workspace.store';

function ProjectSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="skeleton h-6 w-32" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="skeleton h-4 w-full mb-2" />
      <div className="skeleton h-4 w-2/3 mb-4" />
      <div className="flex items-center justify-between">
        <div className="skeleton h-4 w-20" />
        <div className="skeleton h-4 w-16" />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    ACTIVE: { bg: 'bg-success-50', text: 'text-success-700', dot: 'bg-success-500' },
    INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
    DEPLOYING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500 animate-pulse' },
    FAILED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  };

  const config = statusConfig[status] || statusConfig.INACTIVE;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function Projects() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentWorkspace) {
      loadProjects();
    }
  }, [currentWorkspace?.id]);

  const loadProjects = async () => {
    if (!currentWorkspace) return;
    try {
      setIsLoading(true);
      const data = await apiService.getProjects(currentWorkspace.id);
      setProjects(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectClick = (projectId: string) => {
    localStorage.setItem('lastViewedProject', projectId);
    navigate(`/projects/${projectId}`);
  };

  // Stats calculation
  const activeCount = projects.filter(p => p.status === 'ACTIVE').length;
  const totalServices = projects.reduce((sum, p) => sum + (p.services?.length || 0), 0);

  return (
    <div className="px-4 sm:px-0 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-gray-500">
            {currentWorkspace?.name ? `${currentWorkspace.name} workspace` : 'Manage your projects and services'}
          </p>
        </div>
        <Link
          to="/projects/new"
          className="btn btn-primary"
        >
          <svg className="w-5 h-5 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Error message */}
      {error && (
        <div className="alert alert-error mb-6 animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button onClick={loadProjects} className="btn btn-sm btn-ghost ml-auto">
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <ProjectSkeleton key={i} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        /* Empty state */
        <div className="card empty-state py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="empty-state-title text-xl">Create your first project</h3>
          <p className="empty-state-description text-base">
            Projects organize your services, databases, and deployments. Start by creating one!
          </p>
          <Link
            to="/projects/new"
            className="btn btn-primary btn-lg"
          >
            <svg className="w-5 h-5 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Project
          </Link>
          
          {/* Quick tips */}
          <div className="mt-12 grid sm:grid-cols-3 gap-4 max-w-2xl text-left">
            {[
              { icon: '🐳', title: 'Docker Ready', desc: 'Deploy any Dockerfile' },
              { icon: '🔗', title: 'GitHub Integration', desc: 'Auto-deploy on push' },
              { icon: '🌍', title: 'Custom Domains', desc: 'Free SSL included' },
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-gray-50">
                <span className="text-2xl">{tip.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{tip.title}</div>
                  <div className="text-sm text-gray-500">{tip.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="card !p-4">
              <div className="text-sm text-gray-500">Total Projects</div>
              <div className="text-2xl font-bold text-gray-900">{projects.length}</div>
            </div>
            <div className="card !p-4">
              <div className="text-sm text-gray-500">Active</div>
              <div className="text-2xl font-bold text-success-600">{activeCount}</div>
            </div>
            <div className="card !p-4">
              <div className="text-sm text-gray-500">Services</div>
              <div className="text-2xl font-bold text-gray-900">{totalServices}</div>
            </div>
            <div className="card !p-4 hidden sm:block">
              <div className="text-sm text-gray-500">Region</div>
              <div className="text-lg font-bold text-gray-900 flex items-center gap-1">
                🇪🇺 EU-West
              </div>
            </div>
          </div>

          {/* Project grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <div
                key={project.id}
                onClick={() => handleProjectClick(project.id)}
                className="card card-interactive group animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg group-hover:bg-primary-600 group-hover:text-white transition-colors">
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {project.name}
                      </h3>
                      <div className="text-xs text-gray-500">
                        Created {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={project.status} />
                </div>

                {project.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                    <span>{project.services?.length || 0} services</span>
                  </div>
                  {project.services?.some((s: any) => s.status === 'running') && (
                    <div className="flex items-center gap-1.5 text-success-600">
                      <span className="w-2 h-2 rounded-full bg-success-500" />
                      <span>Running</span>
                    </div>
                  )}
                </div>

                {/* Hover arrow */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}

            {/* Add new project card */}
            <Link
              to="/projects/new"
              className="card border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all flex flex-col items-center justify-center min-h-[200px] group"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center mb-3 transition-colors">
                <svg className="w-6 h-6 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="font-medium text-gray-600 group-hover:text-primary-600 transition-colors">
                New Project
              </span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
