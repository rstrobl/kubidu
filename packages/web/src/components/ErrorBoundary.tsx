import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Common error patterns and their user-friendly messages
const ERROR_SUGGESTIONS: Array<{
  pattern: RegExp;
  title: string;
  message: string;
  suggestion: string;
  docLink?: string;
}> = [
  {
    pattern: /network|fetch|ECONNREFUSED|timeout/i,
    title: 'Connection Issue',
    message: 'Unable to connect to the server.',
    suggestion: 'Check your internet connection and try again. If the problem persists, our servers may be experiencing issues.',
  },
  {
    pattern: /401|unauthorized|unauthenticated/i,
    title: 'Session Expired',
    message: 'Your session has expired.',
    suggestion: 'Please log in again to continue.',
  },
  {
    pattern: /403|forbidden|permission/i,
    title: 'Access Denied',
    message: "You don't have permission to access this resource.",
    suggestion: 'Contact your workspace admin if you need access.',
  },
  {
    pattern: /404|not found/i,
    title: 'Not Found',
    message: 'The resource you requested could not be found.',
    suggestion: 'The page or resource may have been deleted or moved.',
  },
  {
    pattern: /500|server error|internal/i,
    title: 'Server Error',
    message: 'Something went wrong on our end.',
    suggestion: 'Our team has been notified. Please try again in a few minutes.',
  },
  {
    pattern: /chunk|module|import|loading chunk/i,
    title: 'App Update Available',
    message: 'A new version of Kubidu is available.',
    suggestion: 'Please refresh the page to load the latest version.',
  },
  {
    pattern: /quota|storage|localstorage/i,
    title: 'Storage Full',
    message: 'Your browser storage is full.',
    suggestion: 'Try clearing your browser cache or using a different browser.',
  },
];

function getErrorSuggestion(error: Error | null) {
  if (!error) return null;

  const errorString = `${error.message} ${error.name} ${error.stack || ''}`;

  for (const suggestion of ERROR_SUGGESTIONS) {
    if (suggestion.pattern.test(errorString)) {
      return suggestion;
    }
  }

  return null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // TODO: Send to error tracking service
    // sendToErrorTracking(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/projects';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const suggestion = getErrorSuggestion(this.state.error);

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-primary-50">
          <div className="max-w-lg w-full">
            {/* Error Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-600 to-success-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">
                      {suggestion ? '⚠️' : '😵'}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {suggestion?.title || 'Something went wrong'}
                    </h2>
                    <p className="text-primary-100 text-sm">
                      Don't worry, we can fix this
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  {suggestion?.message || 'An unexpected error occurred while loading this page.'}
                </p>

                {/* Suggestion Box */}
                <div className="bg-primary-50 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold text-primary-900 mb-2 flex items-center gap-2">
                    <span>💡</span>
                    Suggestion
                  </h3>
                  <p className="text-primary-700 text-sm">
                    {suggestion?.suggestion || 'Try refreshing the page. If the problem persists, please contact support.'}
                  </p>
                  {suggestion?.docLink && (
                    <a
                      href={suggestion.docLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-sm text-primary-600 hover:text-primary-800"
                    >
                      <span>Learn more</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.handleReset}
                    className="flex-1 btn btn-secondary flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Page
                  </button>
                </div>

                {/* Go Home link */}
                <button
                  onClick={this.handleGoHome}
                  className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ← Back to Dashboard
                </button>
              </div>

              {/* Developer Details */}
              {import.meta.env.DEV && this.state.error && (
                <div className="border-t border-gray-100">
                  <details className="p-4">
                    <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">
                      🔧 Developer Details
                    </summary>
                    <div className="mt-3 p-4 bg-gray-900 rounded-lg overflow-auto max-h-60">
                      <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap">
                        <span className="text-red-400">{this.state.error.name}:</span> {this.state.error.message}
                        {'\n\n'}
                        <span className="text-gray-500">{this.state.error.stack}</span>
                      </pre>
                    </div>
                  </details>
                </div>
              )}
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-400 mt-4">
              Error ID: {Date.now().toString(36)} • 
              <a href="mailto:support@kubidu.app" className="ml-1 hover:text-gray-600">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for catching errors in functional components
export function useErrorHandler() {
  const handleError = (error: Error) => {
    console.error('Error caught by useErrorHandler:', error);
    // Could show a toast notification here
  };

  return { handleError };
}
