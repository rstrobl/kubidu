import { Link, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useWorkspaceStore } from '../stores/workspace.store';
import { apiService } from '../services/api.service';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { NotificationBell } from './NotificationBell';
import { useNotificationSocket } from '../hooks/useNotificationSocket';
import { Toaster } from 'sonner';

export function Layout() {
  const { user, logout } = useAuthStore();
  const { currentWorkspace, loadWorkspaces } = useWorkspaceStore();
  const navigate = useNavigate();
  const { id: currentProjectId } = useParams();
  const [projects, setProjects] = useState<any[]>([]);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Connect to notification WebSocket
  useNotificationSocket();

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (currentWorkspace) {
      loadProjects();
    }
  }, [currentWorkspace?.id]);

  // Reload projects if navigating to a project not in the list (e.g., after creating)
  useEffect(() => {
    if (currentProjectId && projects.length > 0 && !projects.find(p => p.id === currentProjectId)) {
      loadProjects();
    }
  }, [currentProjectId]);

  const loadProjects = async () => {
    if (!currentWorkspace) return;
    try {
      const data = await apiService.getProjects(currentWorkspace.id);
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

              {/* Workspace Switcher */}
              <WorkspaceSwitcher />

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

            <div className="flex items-center space-x-3">
              {currentProjectId && currentProject && (
                <>
                  <Link
                    to={`/projects/${currentProjectId}/logs`}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Logs
                  </Link>
                  <button
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Settings
                  </button>
                </>
              )}

              {/* Notification Bell */}
              <NotificationBell />

              {/* User dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium select-none">
                    {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium select-none flex-shrink-0">
                          {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          {user?.name && (
                            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                          )}
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <Link
                        to="/projects"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        All Projects
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Settings
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Close dropdowns when clicking outside */}
      {(showProjectDropdown || showUserMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowProjectDropdown(false);
            setShowUserMenu(false);
          }}
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

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        offset="80px"
        gap={8}
        visibleToasts={5}
        toastOptions={{
          style: {
            marginTop: '8px',
          },
        }}
      />
    </div>
  );
}
