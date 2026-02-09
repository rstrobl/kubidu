import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/auth.store';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { NewProject } from './pages/NewProject';
import { GitHubCallback } from './pages/GitHubCallback';
import { AuthCallback } from './pages/AuthCallback';
import { Settings } from './pages/Settings';
import { ProjectLogs } from './pages/ProjectLogs';
import { NewWorkspace } from './pages/NewWorkspace';
import { WorkspaceSettings } from './pages/WorkspaceSettings';
import { NotificationSettings } from './pages/NotificationSettings';
import { Notifications } from './pages/Notifications';
import { Impact } from './pages/Impact';
import { Activity } from './pages/Activity';
import { Insights } from './pages/Insights';
import { Dependencies } from './pages/Dependencies';
import { StatusPage } from './pages/StatusPage';
import { Billing } from './pages/Billing';
import { AuditLogs } from './pages/AuditLogs';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <span className="text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public route - redirects to dashboard if already authenticated
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <span className="text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    const lastProject = localStorage.getItem('lastViewedProject');
    const redirectTo = lastProject ? `/projects/${lastProject}` : '/projects';
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

// Helper component to redirect to last viewed project
function DefaultRedirect() {
  const lastProject = localStorage.getItem('lastViewedProject');
  const redirectTo = lastProject ? `/projects/${lastProject}` : '/projects';
  return <Navigate to={redirectTo} replace />;
}

// Home route - shows landing for guests, redirects to projects for authenticated users
function HomeRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <span className="text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    const lastProject = localStorage.getItem('lastViewedProject');
    const redirectTo = lastProject ? `/projects/${lastProject}` : '/projects';
    return <Navigate to={redirectTo} replace />;
  }

  return <Landing />;
}

function App() {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomeRoute />} />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password/:token"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />

          {/* GitHub App installation callback (authenticated) */}
          <Route
            path="/github/callback"
            element={
              <ProtectedRoute>
                <GitHubCallback />
              </ProtectedRoute>
            }
          />

          {/* OAuth callback (unauthenticated - creates session) */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Public Status Page (no auth required) */}
          <Route path="/status/:workspaceSlug/:projectSlug" element={<StatusPage />} />

          {/* Legal Pages (public) */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Protected routes with layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Redirect old dashboard route to projects */}
            <Route path="dashboard" element={<DefaultRedirect />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/new" element={<NewProject />} />
            <Route path="projects/:id/logs" element={<ProjectLogs />} />
            <Route path="projects/:id/dependencies" element={<Dependencies />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="workspaces/new" element={<NewWorkspace />} />
            <Route path="workspaces/:id/settings" element={<WorkspaceSettings />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/notifications" element={<NotificationSettings />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="impact" element={<Impact />} />
            <Route path="activity" element={<Activity />} />
            <Route path="insights" element={<Insights />} />
            <Route path="billing" element={<Billing />} />
            <Route path="audit" element={<AuditLogs />} />
          </Route>

          {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
