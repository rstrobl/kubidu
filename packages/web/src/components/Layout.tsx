import { Link, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useWorkspaceStore } from '../stores/workspace.store';
import { apiService } from '../services/api.service';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { NotificationBell } from './NotificationBell';
import { CommandPalette } from './CommandPalette';
import { OnboardingWizard } from './OnboardingWizard';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { DarkModeToggle } from './DarkModeToggle';
import { useNotificationSocket } from '../hooks/useNotificationSocket';
import { Toaster } from 'sonner';
import { FavoritesList } from './FavoriteButton';
import { GlobalSearch } from './GlobalSearch';

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
  const [showFavorites, setShowFavorites] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
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
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              {/* Logo */}
              <Link to="/projects" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">K</span>
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">Kubidu</span>
              </Link>

              {/* Workspace Switcher */}
              <div className="hidden sm:block">
                <WorkspaceSwitcher />
              </div>

              {/* Project Selector Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                >
                  {currentProject && (
                    <span className="w-6 h-6 rounded bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold">
                      {currentProject.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                    {currentProject ? currentProject.name : 'Select Project'}
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showProjectDropdown && (
                  <div className="absolute left-0 mt-2 w-72 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 overflow-hidden animate-scale-in">
                    <div className="py-2">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Your Projects
                      </div>
                      {isLoading ? (
                        <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
                      ) : projects.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No projects yet</div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto scrollbar-thin">
                          {projects.map((project) => (
                            <button
                              key={project.id}
                              onClick={() => handleProjectSelect(project.id)}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors ${
                                project.id === currentProjectId ? 'bg-primary-50' : ''
                              }`}
                            >
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                                project.id === currentProjectId
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {project.name.charAt(0).toUpperCase()}
                              </span>
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-gray-900 block truncate">{project.name}</span>
                                <span className="text-xs text-gray-500">
                                  {project.services?.length || 0} services
                                </span>
                              </div>
                              {project.id === currentProjectId && (
                                <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <Link
                          to="/projects/new"
                          onClick={() => setShowProjectDropdown(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          <span className="w-8 h-8 rounded-lg border-2 border-dashed border-primary-300 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </span>
                          <span className="font-medium">New Project</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Favorites Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowFavorites(!showFavorites)}
                  className="p-2 rounded-lg text-gray-500 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Favorites"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
                {showFavorites && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-lg bg-white dark:bg-gray-900 ring-1 ring-black ring-opacity-5 dark:ring-white/10 z-50 overflow-hidden animate-scale-in">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white">⭐ Favorites</h3>
                    </div>
                    <FavoritesList onSelect={(projectId) => {
                      setShowFavorites(false);
                      navigate(`/projects/${projectId}`);
                    }} />
                  </div>
                )}
              </div>

              {/* Command Palette */}
              <CommandPalette />

              {/* Project-specific actions */}
              {currentProjectId && currentProject && (
                <div className="hidden md:flex items-center mr-2">
                  <Link
                    to={`/projects/${currentProjectId}/logs`}
                    className="btn btn-ghost btn-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    <span className="hidden lg:inline ml-1.5">Logs</span>
                  </Link>
                  <Link
                    to={`/projects/${currentProjectId}/dependencies`}
                    className="btn btn-ghost btn-sm"
                  >
                    <span className="text-sm">🔗</span>
                    <span className="hidden lg:inline ml-1.5">Dependencies</span>
                  </Link>
                  <button
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="btn btn-ghost btn-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="hidden lg:inline ml-1.5">Settings</span>
                  </button>
                </div>
              )}

              {/* Dark Mode Toggle */}
              <DarkModeToggle />

              {/* Notification Bell */}
              <NotificationBell />

              {/* User dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-medium select-none shadow-sm">
                    {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 overflow-hidden animate-scale-in">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-medium select-none flex-shrink-0">
                          {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          {user?.name && (
                            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
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
                        className="dropdown-item"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        All Projects
                      </Link>
                      <Link
                        to="/notifications"
                        onClick={() => setShowUserMenu(false)}
                        className="dropdown-item"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Notifications
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="dropdown-item"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Settings
                      </Link>
                      <Link
                        to="/activity"
                        onClick={() => setShowUserMenu(false)}
                        className="dropdown-item"
                      >
                        <span className="w-4 h-4 text-center">📊</span>
                        Activity Feed
                      </Link>
                      <Link
                        to="/insights"
                        onClick={() => setShowUserMenu(false)}
                        className="dropdown-item"
                      >
                        <span className="w-4 h-4 text-center">📈</span>
                        Deployment Insights
                      </Link>
                      <Link
                        to="/impact"
                        onClick={() => setShowUserMenu(false)}
                        className="dropdown-item"
                      >
                        <span className="w-4 h-4 text-center">🌱</span>
                        Environmental Impact
                      </Link>
                      <Link
                        to="/billing"
                        onClick={() => setShowUserMenu(false)}
                        className="dropdown-item"
                      >
                        <span className="w-4 h-4 text-center">💳</span>
                        Billing & Plans
                      </Link>
                    </div>

                    {/* Footer with region info */}
                    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>🇪🇺</span>
                        <span>EU-West Region</span>
                        <span className="ml-auto flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-success-500 rounded-full" />
                          Online
                        </span>
                      </div>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="dropdown-item dropdown-item-danger w-full"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      {(showProjectDropdown || showUserMenu || showFavorites) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowProjectDropdown(false);
            setShowUserMenu(false);
            setShowFavorites(false);
          }}
        />
      )}
      
      {/* Global Search Modal */}
      <GlobalSearch 
        isOpen={showGlobalSearch} 
        onClose={() => setShowGlobalSearch(false)} 
      />

      {/* Main content with top padding for fixed nav */}
      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
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

      {/* Global modals and overlays */}
      <OnboardingWizard />
      <KeyboardShortcuts />
    </div>
  );
}
