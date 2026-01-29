import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '../services/api.service';

export function GitHubCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const installationId = searchParams.get('installation_id');
    const setupAction = searchParams.get('setup_action') || 'install';

    if (!installationId) {
      setError('Missing installation_id parameter');
      return;
    }

    apiService
      .handleGitHubCallback(installationId, setupAction)
      .then(() => {
        navigate('/projects', { replace: true });
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to complete GitHub App installation');
      });
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg max-w-md">
          <h2 className="text-lg font-semibold mb-2">Installation Failed</h2>
          <p>{error}</p>
          <button
            onClick={() => navigate('/projects', { replace: true })}
            className="mt-4 btn btn-primary"
          >
            Go to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing GitHub App installation...</p>
      </div>
    </div>
  );
}
