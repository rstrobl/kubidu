import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api.service';

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  language: string | null;
  defaultBranch: string;
  updatedAt: string;
  htmlUrl: string;
}

interface GitHubBranch {
  name: string;
  isDefault: boolean;
  commitSha: string;
}

interface Installation {
  id: string;
  installationId: number;
  accountLogin: string;
  accountType: string;
  accountAvatarUrl: string | null;
}

interface GitHubRepoPickerProps {
  onSelect: (
    repo: GitHubRepo,
    installation: Installation,
    branch: string,
  ) => void;
}

export function GitHubRepoPicker({ onSelect }: GitHubRepoPickerProps) {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [error, setError] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input
  useEffect(() => {
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [search]);

  // Fetch installations on mount
  useEffect(() => {
    apiService.getGitHubInstallations()
      .then((data) => {
        setInstallations(data.installations);
        if (data.installations.length === 1) {
          setSelectedInstallation(data.installations[0]);
        }
      })
      .catch(() => setError('Failed to load GitHub installations'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch repos when installation is selected or search changes (debounced)
  useEffect(() => {
    if (!selectedInstallation) return;
    setLoadingRepos(true);
    setSelectedRepo(null);
    setBranches([]);
    setSelectedBranch('');

    apiService.getGitHubRepos(selectedInstallation.id, 1, debouncedSearch || undefined)
      .then((data) => setRepos(data.repos))
      .catch(() => setError('Failed to load repositories'))
      .finally(() => setLoadingRepos(false));
  }, [selectedInstallation, debouncedSearch]);

  // Fetch branches when repo is selected
  useEffect(() => {
    if (!selectedInstallation || !selectedRepo) return;
    setLoadingBranches(true);

    const [owner, repo] = selectedRepo.fullName.split('/');
    apiService.getGitHubBranches(selectedInstallation.id, owner, repo)
      .then((data) => {
        setBranches(data.branches);
        const defaultBranch = data.branches.find((b: GitHubBranch) => b.isDefault);
        setSelectedBranch(defaultBranch?.name || data.branches[0]?.name || 'main');
      })
      .catch(() => setError('Failed to load branches'))
      .finally(() => setLoadingBranches(false));
  }, [selectedInstallation, selectedRepo]);

  const handleConnectGitHub = useCallback(async () => {
    try {
      const data = await apiService.getGitHubInstallUrl();
      window.location.href = data.url;
    } catch {
      setError('Failed to get GitHub install URL');
    }
  }, []);

  const handleImport = useCallback(() => {
    if (selectedRepo && selectedInstallation && selectedBranch) {
      onSelect(selectedRepo, selectedInstallation, selectedBranch);
    }
  }, [selectedRepo, selectedInstallation, selectedBranch, onSelect]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-gray-500">Loading GitHub accounts...</span>
      </div>
    );
  }

  // No installations — show connect button
  if (installations.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        <h3 className="mt-3 text-sm font-medium text-gray-900">Connect GitHub</h3>
        <p className="mt-1 text-sm text-gray-500">
          Install the Kubidu GitHub App to deploy from your repositories.
        </p>
        <button
          type="button"
          onClick={handleConnectGitHub}
          className="mt-4 btn btn-primary"
        >
          Connect GitHub Account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Account picker (if multiple) */}
      {installations.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GitHub Account
          </label>
          <div className="flex flex-wrap gap-2">
            {installations.map((inst) => (
              <button
                key={inst.id}
                type="button"
                onClick={() => setSelectedInstallation(inst)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
                  selectedInstallation?.id === inst.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {inst.accountAvatarUrl && (
                  <img
                    src={inst.accountAvatarUrl}
                    alt={inst.accountLogin}
                    className="w-5 h-5 rounded-full"
                  />
                )}
                <span>{inst.accountLogin}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleConnectGitHub}
            className="mt-2 text-sm text-primary-600 hover:text-primary-700"
          >
            + Add another account
          </button>
        </div>
      )}

      {/* Repo search and list */}
      {selectedInstallation && !selectedRepo && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select a Repository
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories..."
            className="input mb-2"
          />
          {loadingRepos ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {repos.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No repositories found
                </div>
              ) : (
                repos.map((repo) => (
                  <button
                    key={repo.id}
                    type="button"
                    onClick={() => setSelectedRepo(repo)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{repo.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          repo.private
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {repo.private ? 'Private' : 'Public'}
                        </span>
                      </div>
                      {repo.language && (
                        <span className="text-xs text-gray-400">{repo.language}</span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{repo.description}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected repo + branch picker */}
      {selectedRepo && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{selectedRepo.fullName}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  selectedRepo.private
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {selectedRepo.private ? 'Private' : 'Public'}
                </span>
              </div>
              {selectedRepo.description && (
                <p className="text-xs text-gray-500 mt-0.5">{selectedRepo.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedRepo(null);
                setBranches([]);
                setSelectedBranch('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Change
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch
            </label>
            {loadingBranches ? (
              <div className="flex items-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                <span className="ml-2 text-sm text-gray-500">Loading branches...</span>
              </div>
            ) : (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="input"
              >
                {branches.map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name}{branch.isDefault ? ' (default)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="button"
            onClick={handleImport}
            disabled={!selectedBranch || loadingBranches}
            className="w-full btn btn-primary"
          >
            Import Repository
          </button>
        </div>
      )}
    </div>
  );
}
