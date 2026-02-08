import { create } from 'zustand';
import { apiService } from '../services/api.service';
import { WorkspaceRole } from '@kubidu/shared';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string | null;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  user: {
    id: string;
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  expiresAt: string;
  createdAt: string;
}

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  isLoading: boolean;

  // Actions
  loadWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  selectWorkspaceById: (id: string) => void;

  // Workspace CRUD
  createWorkspace: (name: string, avatarUrl?: string) => Promise<Workspace>;
  updateWorkspace: (id: string, data: { name?: string; avatarUrl?: string }) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;

  // Member management
  loadMembers: (workspaceId: string) => Promise<void>;
  updateMemberRole: (workspaceId: string, memberId: string, role: WorkspaceRole) => Promise<void>;
  removeMember: (workspaceId: string, memberId: string) => Promise<void>;
  leaveWorkspace: (workspaceId: string) => Promise<void>;

  // Invitations
  loadInvitations: (workspaceId: string) => Promise<void>;
  inviteMember: (workspaceId: string, email: string, role: WorkspaceRole) => Promise<void>;
  cancelInvitation: (workspaceId: string, invitationId: string) => Promise<void>;
  acceptInvitation: (token: string) => Promise<void>;
}

const CURRENT_WORKSPACE_KEY = 'current_workspace_id';

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  members: [],
  invitations: [],
  isLoading: true,

  loadWorkspaces: async () => {
    try {
      set({ isLoading: true });
      const workspaces = await apiService.getWorkspaces();
      set({ workspaces, isLoading: false });

      // Restore previously selected workspace or select first one
      const savedWorkspaceId = localStorage.getItem(CURRENT_WORKSPACE_KEY);
      const current = get().currentWorkspace;

      if (!current) {
        if (savedWorkspaceId) {
          const saved = workspaces.find((w: Workspace) => w.id === savedWorkspaceId);
          if (saved) {
            set({ currentWorkspace: saved });
            return;
          }
        }
        // Select first workspace if none saved or saved not found
        if (workspaces.length > 0) {
          set({ currentWorkspace: workspaces[0] });
          localStorage.setItem(CURRENT_WORKSPACE_KEY, workspaces[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      set({ isLoading: false });
    }
  },

  setCurrentWorkspace: (workspace: Workspace | null) => {
    set({ currentWorkspace: workspace });
    if (workspace) {
      localStorage.setItem(CURRENT_WORKSPACE_KEY, workspace.id);
    } else {
      localStorage.removeItem(CURRENT_WORKSPACE_KEY);
    }
  },

  selectWorkspaceById: (id: string) => {
    const workspace = get().workspaces.find((w) => w.id === id);
    if (workspace) {
      get().setCurrentWorkspace(workspace);
    }
  },

  createWorkspace: async (name: string, avatarUrl?: string) => {
    const workspace = await apiService.createWorkspace({ name, avatarUrl });
    // Creator is always ADMIN
    const workspaceWithRole = { ...workspace, role: WorkspaceRole.ADMIN };
    set((state) => ({
      workspaces: [...state.workspaces, workspaceWithRole],
      currentWorkspace: workspaceWithRole,
    }));
    localStorage.setItem(CURRENT_WORKSPACE_KEY, workspace.id);
    return workspaceWithRole;
  },

  updateWorkspace: async (id: string, data: { name?: string; avatarUrl?: string }) => {
    const workspace = await apiService.updateWorkspace(id, data);
    set((state) => ({
      workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, ...workspace } : w)),
      currentWorkspace:
        state.currentWorkspace?.id === id ? { ...state.currentWorkspace, ...workspace } : state.currentWorkspace,
    }));
    return workspace;
  },

  deleteWorkspace: async (id: string) => {
    await apiService.deleteWorkspace(id);
    const remaining = get().workspaces.filter((w) => w.id !== id);
    set({
      workspaces: remaining,
      currentWorkspace: get().currentWorkspace?.id === id ? (remaining[0] || null) : get().currentWorkspace,
    });
    if (remaining.length > 0 && get().currentWorkspace?.id !== remaining[0].id) {
      localStorage.setItem(CURRENT_WORKSPACE_KEY, remaining[0].id);
    }
  },

  loadMembers: async (workspaceId: string) => {
    const members = await apiService.getWorkspaceMembers(workspaceId);
    set({ members });
  },

  updateMemberRole: async (workspaceId: string, memberId: string, role: WorkspaceRole) => {
    await apiService.updateMemberRole(workspaceId, memberId, { role });
    set((state) => ({
      members: state.members.map((m) => (m.id === memberId ? { ...m, role } : m)),
    }));
  },

  removeMember: async (workspaceId: string, memberId: string) => {
    await apiService.removeMember(workspaceId, memberId);
    set((state) => ({
      members: state.members.filter((m) => m.id !== memberId),
    }));
  },

  leaveWorkspace: async (workspaceId: string) => {
    await apiService.leaveWorkspace(workspaceId);
    const remaining = get().workspaces.filter((w) => w.id !== workspaceId);
    set({
      workspaces: remaining,
      currentWorkspace: get().currentWorkspace?.id === workspaceId ? (remaining[0] || null) : get().currentWorkspace,
    });
  },

  loadInvitations: async (workspaceId: string) => {
    const invitations = await apiService.getWorkspaceInvitations(workspaceId);
    set({ invitations });
  },

  inviteMember: async (workspaceId: string, email: string, role: WorkspaceRole) => {
    const invitation = await apiService.inviteMember(workspaceId, { email, role });
    set((state) => ({
      invitations: [...state.invitations, invitation],
    }));
  },

  cancelInvitation: async (workspaceId: string, invitationId: string) => {
    await apiService.cancelInvitation(workspaceId, invitationId);
    set((state) => ({
      invitations: state.invitations.filter((i) => i.id !== invitationId),
    }));
  },

  acceptInvitation: async (token: string) => {
    await apiService.acceptInvitation(token);
    // Reload workspaces to get the new one
    await get().loadWorkspaces();
  },
}));
