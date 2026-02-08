import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspace.store';
import { useAuthStore } from '../stores/auth.store';
import { WorkspaceRole } from '@kubidu/shared';

export function WorkspaceSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentWorkspace,
    members,
    invitations,
    updateWorkspace,
    deleteWorkspace,
    loadMembers,
    loadInvitations,
    updateMemberRole,
    removeMember,
    leaveWorkspace,
    inviteMember,
    cancelInvitation,
  } = useWorkspaceStore();

  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>(WorkspaceRole.MEMBER);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const isAdmin = currentWorkspace?.role === WorkspaceRole.ADMIN;

  useEffect(() => {
    if (id) {
      loadMembers(id);
      loadInvitations(id);
    }
  }, [id]);

  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name);
    }
  }, [currentWorkspace]);

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !isAdmin) return;

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await updateWorkspace(id, { name });
      setSuccess('Workspace updated successfully.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !isAdmin) return;

    setInviteError('');
    setInviteLoading(true);

    try {
      await inviteMember(id, inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteRole(WorkspaceRole.MEMBER);
    } catch (err: any) {
      setInviteError(err.response?.data?.message || 'Failed to send invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: WorkspaceRole) => {
    if (!id || !isAdmin) return;
    try {
      await updateMemberRole(id, memberId, newRole);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update role.');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!id || !isAdmin) return;
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await removeMember(id, memberId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!id || !isAdmin) return;

    try {
      await cancelInvitation(id, invitationId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel invitation.');
    }
  };

  const handleLeave = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to leave this workspace?')) return;

    try {
      await leaveWorkspace(id);
      navigate('/projects');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to leave workspace.');
    }
  };

  const handleDelete = async () => {
    if (!id || !isAdmin) return;
    if (deleteConfirmText !== currentWorkspace?.name) return;

    try {
      await deleteWorkspace(id);
      navigate('/projects');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete workspace.');
    }
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

  if (!currentWorkspace || currentWorkspace.id !== id) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Workspace Settings</h1>
        <p className="mt-2 text-gray-600">{currentWorkspace.name}</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* General Settings */}
      {isAdmin && (
        <form onSubmit={handleUpdateWorkspace} className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">General</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Workspace Name
              </label>
              <input
                type="text"
                id="name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <button type="submit" disabled={isLoading} className="btn btn-primary">
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Members */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Members</h2>

        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                  {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {member.user.name || member.user.email}
                    {member.userId === user?.id && (
                      <span className="ml-2 text-xs text-gray-500">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{member.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isAdmin && member.userId !== user?.id ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as WorkspaceRole)}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-primary-500"
                    >
                      <option value={WorkspaceRole.ADMIN}>Admin</option>
                      <option value={WorkspaceRole.MEMBER}>Member</option>
                      <option value={WorkspaceRole.DEPLOYER}>Deployer</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded ${getRoleBadgeColor(member.role)}`}>
                    {member.role}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Members */}
      {isAdmin && (
        <form onSubmit={handleInvite} className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite Members</h2>

          {inviteError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
              {inviteError}
            </div>
          )}

          <div className="flex gap-3">
            <input
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500"
            >
              <option value={WorkspaceRole.ADMIN}>Admin</option>
              <option value={WorkspaceRole.MEMBER}>Member</option>
              <option value={WorkspaceRole.DEPLOYER}>Deployer</option>
            </select>
            <button type="submit" disabled={inviteLoading} className="btn btn-primary">
              {inviteLoading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Pending Invitations</h3>
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-gray-900">{invitation.email}</p>
                      <p className="text-xs text-gray-500">
                        Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded ${getRoleBadgeColor(invitation.role)}`}>
                        {invitation.role}
                      </span>
                      <button
                        onClick={() => handleCancelInvitation(invitation.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      )}

      {/* Danger Zone */}
      <div className="card border-red-200">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>

        <div className="space-y-4">
          {!isAdmin && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Leave Workspace</p>
                <p className="text-sm text-gray-500">You will lose access to all projects in this workspace.</p>
              </div>
              <button onClick={handleLeave} className="btn bg-red-600 text-white hover:bg-red-700">
                Leave
              </button>
            </div>
          )}

          {isAdmin && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Delete Workspace</p>
                  <p className="text-sm text-gray-500">
                    This will permanently delete the workspace and all its projects.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                  className="btn bg-red-600 text-white hover:bg-red-700"
                >
                  Delete Workspace
                </button>
              </div>

              {showDeleteConfirm && (
                <div className="mt-4 p-4 bg-red-50 rounded-md">
                  <p className="text-sm text-red-800 mb-3">
                    Type <strong>{currentWorkspace.name}</strong> to confirm deletion:
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="flex-1 px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-red-500"
                      placeholder={currentWorkspace.name}
                    />
                    <button
                      onClick={handleDelete}
                      disabled={deleteConfirmText !== currentWorkspace.name}
                      className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
