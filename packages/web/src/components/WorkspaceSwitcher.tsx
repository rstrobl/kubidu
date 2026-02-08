import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspace.store';
import { WorkspaceRole } from '@kubidu/shared';

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, selectWorkspaceById, isLoading } = useWorkspaceStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectWorkspace = (id: string) => {
    selectWorkspaceById(id);
    setIsOpen(false);
    navigate('/projects');
  };

  const getRoleBadgeColor = (role: WorkspaceRole) => {
    switch (role) {
      case WorkspaceRole.ADMIN:
        return 'bg-purple-100 text-purple-700';
      case WorkspaceRole.MEMBER:
        return 'bg-blue-100 text-blue-700';
      case WorkspaceRole.DEPLOYER:
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {currentWorkspace?.avatarUrl ? (
          <img
            src={currentWorkspace.avatarUrl}
            alt=""
            className="w-5 h-5 rounded-full"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-medium">
            {currentWorkspace?.name?.charAt(0).toUpperCase() || 'W'}
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 max-w-[150px] truncate">
          {currentWorkspace?.name || 'Select Workspace'}
        </span>
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Your Workspaces
            </div>

            {isLoading ? (
              <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
            ) : workspaces.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">No workspaces</div>
            ) : (
              workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => handleSelectWorkspace(workspace.id)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    workspace.id === currentWorkspace?.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {workspace.avatarUrl ? (
                        <img
                          src={workspace.avatarUrl}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-medium">
                          {workspace.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className={`text-sm font-medium ${
                          workspace.id === currentWorkspace?.id ? 'text-primary-700' : 'text-gray-900'
                        }`}>
                          {workspace.name}
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor(workspace.role)}`}>
                          {workspace.role}
                        </span>
                      </div>
                    </div>
                    {workspace.id === currentWorkspace?.id && (
                      <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            )}

            <div className="border-t border-gray-100 mt-1 pt-1">
              <Link
                to="/workspaces/new"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-2 text-sm text-primary-600 hover:bg-gray-100"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Workspace
              </Link>
              {currentWorkspace && (
                <Link
                  to={`/workspaces/${currentWorkspace.id}/settings`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Workspace Settings
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
