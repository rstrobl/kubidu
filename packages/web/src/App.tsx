import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/auth.store';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { NewProject } from './pages/NewProject';
import { GitHubCallback } from './pages/GitHubCallback';
import { Settings } from './pages/Settings';
import { ProjectLogs } from './pages/ProjectLogs';
import { NewWorkspace } from './pages/NewWorkspace';
import { WorkspaceSettings } from './pages/WorkspaceSettings';
import { NotificationSettings } from './pages/NotificationSettings';
import { Notifications } from './pages/Notifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Helper component to redirect to last viewed project
function DefaultRedirect() {
  const lastProject = localStorage.getItem('lastViewedProject');
  const redirectTo = lastProject ? `/projects/${lastProject}` : '/projects';
  return <Navigate to={redirectTo} replace />;
}

function App() {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/github/callback"
            element={
              <ProtectedRoute>
                <GitHubCallback />
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DefaultRedirect />} />
            {/* Redirect old dashboard route to projects */}
            <Route path="dashboard" element={<DefaultRedirect />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/new" element={<NewProject />} />
            <Route path="projects/:id/logs" element={<ProjectLogs />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="workspaces/new" element={<NewWorkspace />} />
            <Route path="workspaces/:id/settings" element={<WorkspaceSettings />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/notifications" element={<NotificationSettings />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
