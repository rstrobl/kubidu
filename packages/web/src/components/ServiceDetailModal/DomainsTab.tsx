import { Domain, Deployment, Service } from './types';
import { formatDistanceToNow } from '../../utils/date';

// Helper wrapper to handle string dates
function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { style: 'long' });
}

interface DomainsTabProps {
  service: Service;
  domains: Domain[];
  deployments: Deployment[];
  showDomainForm: boolean;
  domainInput: string;
  domainLoading: boolean;
  verifyingDomain: string | null;
  editingSubdomain: boolean;
  subdomainInput: string;
  subdomainLoading: boolean;
  copiedSubdomain: boolean;
  onShowDomainFormChange: (show: boolean) => void;
  onDomainInputChange: (value: string) => void;
  onAddDomain: (e: React.FormEvent) => void;
  onVerifyDomain: (domainId: string) => void;
  onDeleteDomain: (domainId: string) => void;
  onEditingSubdomainChange: (editing: boolean) => void;
  onSubdomainInputChange: (value: string) => void;
  onSaveSubdomain: () => void;
  onCopySubdomain: () => void;
}

export function DomainsTab({
  service,
  domains,
  deployments,
  showDomainForm,
  domainInput,
  domainLoading,
  verifyingDomain,
  editingSubdomain,
  subdomainInput,
  subdomainLoading,
  copiedSubdomain,
  onShowDomainFormChange,
  onDomainInputChange,
  onAddDomain,
  onVerifyDomain,
  onDeleteDomain,
  onEditingSubdomainChange,
  onSubdomainInputChange,
  onSaveSubdomain,
  onCopySubdomain,
}: DomainsTabProps) {
  return (
    <div className="space-y-6">
      {/* Kubidu Subdomain Section */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Kubidu Subdomain</h2>
        <p className="text-sm text-gray-600 mb-4">
          Choose a friendly subdomain for your service. This will be your primary URL.
        </p>

        {!editingSubdomain ? (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              {service.subdomain ? (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="font-mono text-lg font-semibold text-primary-600">
                      https://{service.subdomain}.127.0.0.1.nip.io
                    </div>
                    <button
                      onClick={onCopySubdomain}
                      className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedSubdomain ? (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Your service is accessible at this URL
                  </div>
                </>
              ) : (
                <>
                  <div className="text-gray-500 italic">No subdomain set</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Set a subdomain to make your service publicly accessible
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => {
                onSubdomainInputChange(service.subdomain || '');
                onEditingSubdomainChange(true);
              }}
              className="btn btn-secondary ml-4"
            >
              {service.subdomain ? 'Change' : 'Set Subdomain'}
            </button>
          </div>
        ) : (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subdomain
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={subdomainInput}
                    onChange={(e) => onSubdomainInputChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="input flex-1"
                    placeholder="myapp"
                    pattern="^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">.127.0.0.1.nip.io</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {subdomainInput
                    ? `Your service will be: https://${subdomainInput}.127.0.0.1.nip.io`
                    : 'Lowercase letters, numbers, and hyphens only (2-63 characters)'}
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    onEditingSubdomainChange(false);
                    onSubdomainInputChange('');
                  }}
                  className="btn btn-secondary"
                  disabled={subdomainLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={onSaveSubdomain}
                  className="btn btn-primary"
                  disabled={subdomainLoading}
                >
                  {subdomainLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Domains Section */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Custom Domains</h2>
          <button
            onClick={() => onShowDomainFormChange(!showDomainForm)}
            className="btn btn-primary"
          >
            {showDomainForm ? 'Cancel' : 'Add Domain'}
          </button>
        </div>

        {showDomainForm && (
          <form onSubmit={onAddDomain} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => onDomainInputChange(e.target.value)}
                  className="input"
                  placeholder="api.example.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your custom domain (e.g., api.example.com)
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => onShowDomainFormChange(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={domainLoading}
                >
                  {domainLoading ? 'Adding...' : 'Add Domain'}
                </button>
              </div>
            </div>
          </form>
        )}

        {domains.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No custom domains configured. Add a domain to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {domain.domain}
                      </h3>
                      {domain.isVerified ? (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                          Verified
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
                          Pending Verification
                        </span>
                      )}
                    </div>

                    {!domain.isVerified && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                          Verification Required
                        </p>
                        <p className="text-sm text-blue-700 mb-2">
                          Add one of the following DNS records to verify ownership:
                        </p>
                        <div className="space-y-2">
                          <div className="bg-white p-2 rounded border border-blue-200">
                            <p className="text-xs font-mono text-gray-600">
                              TXT Record:
                            </p>
                            <p className="text-sm font-mono text-gray-900 break-all">
                              kubidu-verification={domain.verificationCode}
                            </p>
                          </div>
                          <div className="text-xs text-blue-600">
                            OR
                          </div>
                          <div className="bg-white p-2 rounded border border-blue-200">
                            <p className="text-xs font-mono text-gray-600">
                              CNAME Record pointing to:
                            </p>
                            <p className="text-sm font-mono text-gray-900 break-all">
                              {deployments.find((d) => d.isActive)?.url?.replace('http://', '') || 'your-auto-generated-domain'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-gray-500 mt-2">
                      Added {formatRelativeTime(domain.createdAt)}
                      {domain.verifiedAt && ` - Verified ${formatRelativeTime(domain.verifiedAt)}`}
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    {!domain.isVerified && (
                      <button
                        onClick={() => onVerifyDomain(domain.id)}
                        className="btn btn-primary text-sm"
                        disabled={verifyingDomain === domain.id}
                      >
                        {verifyingDomain === domain.id ? 'Verifying...' : 'Verify'}
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteDomain(domain.id)}
                      className="btn bg-red-600 hover:bg-red-700 text-white text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
