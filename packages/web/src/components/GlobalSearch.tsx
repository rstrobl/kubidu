import { useState, useEffect, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api.service';
import { useDebounce } from '../hooks/useDebounce';

interface SearchResult {
  type: 'project' | 'service' | 'deployment' | 'environment' | 'webhook';
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  url: string;
  icon: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeType, setActiveType] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const debouncedQuery = useDebounce(query, 200);

  // Search query
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery, activeType],
    queryFn: () => apiService.search(
      debouncedQuery,
      activeType ? [activeType] : undefined,
      20
    ),
    enabled: debouncedQuery.length >= 2 && isOpen,
    staleTime: 10000,
  });

  // Suggestions query
  const { data: suggestions = [] } = useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: () => apiService.getSearchSuggestions(query),
    enabled: query.length >= 1 && query.length < 3 && isOpen,
    staleTime: 30000,
  });

  const results = searchResults?.results || [];
  const categories = searchResults?.categories || [];

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setActiveType(null);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    onClose();
  };

  const typeIcons: Record<string, string> = {
    project: '📦',
    service: '⚙️',
    deployment: '🚀',
    environment: '🌍',
    webhook: '🔔',
  };

  const typeLabels: Record<string, string> = {
    project: 'Projects',
    service: 'Services',
    deployment: 'Deployments',
    environment: 'Environments',
    webhook: 'Webhooks',
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transition-all">
              {/* Search Input */}
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full border-0 bg-transparent py-4 pl-12 pr-4 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-0 text-base"
                  placeholder="Search projects, services, deployments..."
                />
                {isLoading && (
                  <div className="absolute inset-y-0 right-4 flex items-center">
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Category Filters */}
              {categories.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2 flex gap-2 overflow-x-auto">
                  <button
                    onClick={() => setActiveType(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      activeType === null
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    All ({searchResults?.total})
                  </button>
                  {categories.map((cat: { type: string; count: number }) => (
                    <button
                      key={cat.type}
                      onClick={() => setActiveType(cat.type === activeType ? null : cat.type)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                        activeType === cat.type
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {typeIcons[cat.type]} {typeLabels[cat.type]} ({cat.count})
                    </button>
                  ))}
                </div>
              )}

              {/* Results */}
              <div className="border-t border-gray-100 dark:border-gray-800 max-h-[60vh] overflow-y-auto">
                {/* Suggestions (when query is short) */}
                {query.length > 0 && query.length < 3 && suggestions.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Suggestions</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion: string) => (
                        <button
                          key={suggestion}
                          onClick={() => setQuery(suggestion)}
                          className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Results */}
                {results.length > 0 && (
                  <ul className="py-2">
                    {results.map((result: SearchResult, index: number) => (
                      <li key={`${result.type}-${result.id}`}>
                        <button
                          onClick={() => handleSelect(result)}
                          className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors ${
                            index === selectedIndex
                              ? 'bg-primary-50 dark:bg-primary-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <span className="text-xl flex-shrink-0 mt-0.5">{result.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white truncate">
                                {result.title}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase">
                                {result.type}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {result.subtitle}
                            </p>
                            {result.description && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                {result.description}
                              </p>
                            )}
                          </div>
                          <span className="text-gray-400 dark:text-gray-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Empty State */}
                {query.length >= 2 && !isLoading && results.length === 0 && (
                  <div className="px-4 py-12 text-center">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-gray-900 dark:text-white font-medium">No results found</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                      Try a different search term
                    </p>
                  </div>
                )}

                {/* Initial State */}
                {query.length === 0 && (
                  <div className="px-4 py-8">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
                      QUICK ACTIONS
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { navigate('/projects'); onClose(); }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        <span className="text-lg">📦</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">All Projects</span>
                      </button>
                      <button
                        onClick={() => { navigate('/projects/new'); onClose(); }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        <span className="text-lg">➕</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">New Project</span>
                      </button>
                      <button
                        onClick={() => { navigate('/activity'); onClose(); }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        <span className="text-lg">📊</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Activity</span>
                      </button>
                      <button
                        onClick={() => { navigate('/settings'); onClose(); }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        <span className="text-lg">⚙️</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Settings</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2.5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[10px]">↑↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[10px]">↵</kbd>
                    select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[10px]">esc</kbd>
                    close
                  </span>
                </div>
                <span>Powered by Kubidu Search</span>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

// Hook for debouncing
function useDebounceHook<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
