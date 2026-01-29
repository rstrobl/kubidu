import { Link, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { apiService } from '../services/api.service';
import { ProjectSettingsModal } from './ProjectSettingsModal';

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { id: currentProjectId } = useParams();
  const [projects, setProjects] = useState<any[]>([]);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await apiService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProjectSelect = (projectId: string) => {
    localStorage.setItem('lastViewedProject', projectId);
    setShowProjectDropdown(false);
    navigate(`/projects/${projectId}`);
  };

  const currentProject = projects.find(p => p.id === currentProjectId);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/projects" className="flex items-center">
                <span className="text-2xl font-bold text-primary-600">Kubidu</span>
              </Link>

              {/* Project Selector Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {currentProject ? currentProject.name : 'Select Project'}
                  </span>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showProjectDropdown && (
                  <div className="absolute left-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Your Projects
                      </div>
                      {isLoading ? (
                        <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
                      ) : projects.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-gray-500">No projects yet</div>
                      ) : (
                        projects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => handleProjectSelect(project.id)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                              project.id === currentProjectId ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{project.name}</span>
                              {project.id === currentProjectId && (
                                <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <Link
                          to="/projects/new"
                          onClick={() => setShowProjectDropdown(false)}
                          className="flex items-center px-4 py-2 text-sm text-primary-600 hover:bg-gray-100"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          New Project
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {currentProjectId && currentProject && (
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-md hover:bg-gray-100"
                  title="Project Settings"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="btn btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Close dropdown when clicking outside */}
      {showProjectDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowProjectDropdown(false)}
        />
      )}

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {/* Project Settings Modal */}
      {currentProjectId && currentProject && (
        <ProjectSettingsModal
          projectId={currentProjectId}
          project={currentProject}
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onProjectUpdated={() => {
            loadProjects();
          }}
          onProjectDeleted={() => {
            loadProjects();
            navigate('/projects');
          }}
        />
      )}
    </div>
  );
}
