import { useEffect, useRef, useState } from 'react';

interface LogViewerProps {
  logs: string;
  isLoading: boolean;
  isStreaming?: boolean;
  title?: string;
  onRefresh?: () => void;
  autoScroll?: boolean;
}

export function LogViewer({
  logs,
  isLoading,
  isStreaming = false,
  title = 'Logs',
  onRefresh,
  autoScroll = true,
}: LogViewerProps) {
  const containerRef = useRef<HTMLPreElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(autoScroll);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (shouldAutoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, shouldAutoScroll]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setShouldAutoScroll(isAtBottom);
    }
  };

  // Highlight search matches
  const highlightedLogs = searchQuery
    ? logs.split('\n').map((line, i) => {
        if (line.toLowerCase().includes(searchQuery.toLowerCase())) {
          const regex = new RegExp(`(${searchQuery})`, 'gi');
          return (
            <div key={i} className="bg-yellow-900/30">
              {line.split(regex).map((part, j) =>
                part.toLowerCase() === searchQuery.toLowerCase() ? (
                  <mark key={j} className="bg-yellow-500 text-black px-0.5 rounded">
                    {part}
                  </mark>
                ) : (
                  part
                )
              )}
            </div>
          );
        }
        return <div key={i}>{line}</div>;
      })
    : logs;

  const logContent = typeof highlightedLogs === 'string' ? highlightedLogs : null;

  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-900 p-4' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded-t-lg">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-medium text-gray-200">{title}</h4>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live
            </span>
          )}
          {isLoading && (
            <span className="text-xs text-gray-400 animate-pulse">Loading...</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="bg-gray-700 text-gray-200 text-xs rounded px-2 py-1 w-40 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                ×
              </button>
            )}
          </div>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setShouldAutoScroll(!shouldAutoScroll)}
            className={`p-1 rounded ${
              shouldAutoScroll ? 'text-green-400' : 'text-gray-400'
            } hover:bg-gray-700`}
            title={shouldAutoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700"
              title="Refresh logs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isFullscreen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
          </button>

          {/* Copy button */}
          <button
            onClick={() => navigator.clipboard.writeText(logs)}
            className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700"
            title="Copy logs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Log content */}
      <pre
        ref={containerRef}
        onScroll={handleScroll}
        className={`bg-gray-900 text-green-400 p-4 rounded-b-lg text-xs overflow-x-auto overflow-y-auto font-mono whitespace-pre-wrap ${
          isFullscreen ? 'flex-1' : 'max-h-96'
        }`}
      >
        {logs ? (
          logContent || highlightedLogs
        ) : (
          <span className="text-gray-500 italic">
            {isLoading ? 'Loading logs...' : 'No logs available'}
          </span>
        )}
      </pre>

      {/* Status bar */}
      <div className="flex items-center justify-between bg-gray-800 px-3 py-1 rounded-b text-xs text-gray-400">
        <span>
          {logs ? `${logs.split('\n').length} lines` : '0 lines'}
        </span>
        {searchQuery && (
          <span>
            {(logs.match(new RegExp(searchQuery, 'gi')) || []).length} matches
          </span>
        )}
      </div>
    </div>
  );
}
