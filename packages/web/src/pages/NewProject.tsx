import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '../services/api.service';
import { useWorkspaceStore } from '../stores/workspace.store';

export function NewProject() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentWorkspace) {
      setError('No workspace selected');
      return;
    }

    setIsLoading(true);

    try {
      const project = await apiService.createProject(currentWorkspace.id, {
        name,
        description: description || undefined,
      });
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to create project. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Generate slug preview
  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/projects" className="hover:text-gray-700 transition-colors">
          Projects
        </Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">New Project</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create New Project</h1>
        <p className="mt-2 text-gray-600">
          Projects organize your services, databases, and deployments together.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card">
        {error && (
          <div className="alert alert-error mb-6 animate-fade-in">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6">
          <div className="input-group">
            <label htmlFor="name" className="label">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              className="input"
              placeholder="my-awesome-project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {name && (
              <p className="mt-2 text-sm text-gray-500">
                Your services will be available at: <code className="code-inline">{slug || 'your-project'}.kubidu.io</code>
              </p>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="description" className="label">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              rows={3}
              className="input resize-none"
              placeholder="What does this project do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* What's next info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              What happens next?
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">1</span>
                Connect a GitHub repo or Docker image
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">2</span>
                Configure environment variables
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">3</span>
                Deploy with one click!
              </li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="btn btn-primary"
            >
              {isLoading ? (
                <>
                  <span className="spinner spinner-sm" />
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Project
                </>
              )}
            </button>
            <Link
              to="/projects"
              className="btn btn-secondary"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>

      {/* Tips */}
      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-white">
          <span className="text-2xl">🔗</span>
          <div>
            <div className="font-medium text-gray-900">GitHub Integration</div>
            <div className="text-sm text-gray-500">Auto-deploy on every push to main</div>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-white">
          <span className="text-2xl">🔒</span>
          <div>
            <div className="font-medium text-gray-900">Secure by Default</div>
            <div className="text-sm text-gray-500">Free SSL, encrypted secrets</div>
          </div>
        </div>
      </div>
    </div>
  );
}
