import { useState, useEffect, useRef, Fragment, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api.service';
import { useWorkspaceStore } from '../stores/workspace.store';
import confetti from 'canvas-confetti';

interface CommandItem {
  id: string;
  name: string;
  description?: string;
  icon: React.ReactNode;
  category: 'project' | 'service' | 'action' | 'navigation' | 'recent';
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch projects for the current workspace
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentWorkspace?.id],
    queryFn: () => apiService.getProjects(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id && isOpen,
  });

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Get recent items from localStorage
  const getRecentItems = useCallback((): string[] => {
    try {
      const recent = localStorage.getItem('kubidu_recent_commands');
      return recent ? JSON.parse(recent) : [];
    } catch {
      return [];
    }
  }, []);

  // Save to recent items
  const addToRecent = useCallback((id: string) => {
    const recent = getRecentItems();
    const updated = [id, ...recent.filter((r) => r !== id)].slice(0, 5);
    localStorage.setItem('kubidu_recent_commands', JSON.stringify(updated));
  }, [getRecentItems]);

  // Build command items
  const buildCommands = useCallback((): CommandItem[] => {
    const commands: CommandItem[] = [];
    const recentIds = getRecentItems();

    // Navigation actions
    commands.push({
      id: 'nav-projects',
      name: 'All Projects',
      description: 'View all your projects',
      icon: <FolderIcon />,
      category: 'navigation',
      action: () => navigate('/projects'),
      keywords: ['home', 'dashboard', 'list'],
    });

    commands.push({
      id: 'nav-new-project',
      name: 'New Project',
      description: 'Create a new project',
      icon: <PlusIcon />,
      category: 'action',
      action: () => navigate('/projects/new'),
      keywords: ['create', 'add'],
    });

    commands.push({
      id: 'nav-settings',
      name: 'Settings',
      description: 'Account and preferences',
      icon: <CogIcon />,
      category: 'navigation',
      action: () => navigate('/settings'),
      keywords: ['account', 'profile', 'preferences'],
    });

    commands.push({
      id: 'nav-notifications',
      name: 'Notifications',
      description: 'View your notifications',
      icon: <BellIcon />,
      category: 'navigation',
      action: () => navigate('/notifications'),
      keywords: ['alerts', 'messages'],
    });

    // Add projects as commands
    projects.forEach((project: any) => {
      commands.push({
        id: `project-${project.id}`,
        name: project.name,
        description: `${project.services?.length || 0} services`,
        icon: <ProjectIcon letter={project.name.charAt(0).toUpperCase()} />,
        category: recentIds.includes(`project-${project.id}`) ? 'recent' : 'project',
        action: () => {
          localStorage.setItem('lastViewedProject', project.id);
          navigate(`/projects/${project.id}`);
        },
        keywords: ['project'],
      });

      // Add services for each project
      project.services?.forEach((service: any) => {
        commands.push({
          id: `service-${service.id}`,
          name: `${project.name} / ${service.name}`,
          description: service.status,
          icon: <ServiceIcon type={service.serviceType} />,
          category: recentIds.includes(`service-${service.id}`) ? 'recent' : 'service',
          action: () => {
            localStorage.setItem('lastViewedProject', project.id);
            navigate(`/projects/${project.id}?service=${service.id}`);
          },
          keywords: ['service', service.serviceType?.toLowerCase()],
        });
      });
    });

    // Quick actions
    commands.push({
      id: 'action-deploy',
      name: 'Deploy Service',
      description: 'Trigger a new deployment',
      icon: <RocketIcon />,
      category: 'action',
      action: () => {
        // Show a toast that deployment would be triggered
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#16A34A', '#22C55E', '#4ADE80'],
        });
        setIsOpen(false);
      },
      keywords: ['ship', 'release', 'build'],
    });

    commands.push({
      id: 'action-logs',
      name: 'View Logs',
      description: 'Open log viewer',
      icon: <LogsIcon />,
      category: 'action',
      action: () => {
        const lastProject = localStorage.getItem('lastViewedProject');
        if (lastProject) {
          navigate(`/projects/${lastProject}/logs`);
        } else {
          navigate('/projects');
        }
      },
      keywords: ['debug', 'console', 'output'],
    });

    return commands;
  }, [projects, navigate, getRecentItems]);

  const commands = buildCommands();

  // Filter commands based on query
  const filteredCommands = query === ''
    ? commands
    : commands.filter((command) => {
        const searchStr = `${command.name} ${command.description || ''} ${command.keywords?.join(' ') || ''}`.toLowerCase();
        return searchStr.includes(query.toLowerCase());
      });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.category]) {
      acc[command.category] = [];
    }
    acc[command.category].push(command);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const categoryLabels: Record<string, string> = {
    recent: '⏱️ Recent',
    action: '⚡ Quick Actions',
    navigation: '🧭 Navigation',
    project: '📁 Projects',
    service: '🔧 Services',
  };

  const handleSelect = (command: CommandItem | null) => {
    if (command) {
      addToRecent(command.id);
      command.action();
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Keyboard hint in navbar */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Search...</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium text-gray-400 bg-gray-200 rounded">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={setIsOpen}>
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
              <Dialog.Panel className="mx-auto max-w-2xl transform rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-all overflow-hidden">
                <Combobox onChange={handleSelect}>
                  <div className="relative">
                    <svg
                      className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <Combobox.Input
                      ref={inputRef}
                      className="h-14 w-full border-0 bg-transparent pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 text-base"
                      placeholder="Search projects, services, actions..."
                      onChange={(e) => setQuery(e.target.value)}
                      value={query}
                    />
                    <div className="absolute right-4 top-4">
                      <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">
                        ESC
                      </kbd>
                    </div>
                  </div>

                  {filteredCommands.length > 0 && (
                    <Combobox.Options static className="max-h-[60vh] scroll-py-2 overflow-y-auto border-t border-gray-100">
                      {['recent', 'action', 'navigation', 'project', 'service'].map((category) => {
                        const items = groupedCommands[category];
                        if (!items?.length) return null;

                        return (
                          <div key={category}>
                            <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                              {categoryLabels[category]}
                            </h3>
                            {items.map((command) => (
                              <Combobox.Option
                                key={command.id}
                                value={command}
                                className={({ active }) =>
                                  `cursor-pointer select-none px-4 py-3 flex items-center gap-3 ${
                                    active ? 'bg-primary-50 text-primary-900' : 'text-gray-900'
                                  }`
                                }
                              >
                                {({ active }) => (
                                  <>
                                    <span className={`flex-shrink-0 ${active ? 'text-primary-600' : 'text-gray-400'}`}>
                                      {command.icon}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{command.name}</p>
                                      {command.description && (
                                        <p className={`text-xs truncate ${active ? 'text-primary-600' : 'text-gray-500'}`}>
                                          {command.description}
                                        </p>
                                      )}
                                    </div>
                                    {active && (
                                      <span className="text-xs text-primary-500 flex-shrink-0">
                                        ↵ Enter
                                      </span>
                                    )}
                                  </>
                                )}
                              </Combobox.Option>
                            ))}
                          </div>
                        );
                      })}
                    </Combobox.Options>
                  )}

                  {query !== '' && filteredCommands.length === 0 && (
                    <div className="px-6 py-14 text-center border-t border-gray-100">
                      <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="mt-4 text-sm text-gray-500">
                        No results found for "<span className="font-medium">{query}</span>"
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Try searching for projects, services, or actions
                      </p>
                    </div>
                  )}

                  {/* Footer with keyboard hints */}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200">↑</kbd>
                        <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200">↓</kbd>
                        to navigate
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200">↵</kbd>
                        to select
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <span className="text-primary-600">🌱</span>
                      Powered by green energy
                    </div>
                  </div>
                </Combobox>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}

// Icon components
function FolderIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  );
}

function LogsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  );
}

function ProjectIcon({ letter }: { letter: string }) {
  return (
    <span className="w-5 h-5 rounded bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
      {letter}
    </span>
  );
}

function ServiceIcon({ type }: { type?: string }) {
  if (type === 'DOCKER_IMAGE') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
