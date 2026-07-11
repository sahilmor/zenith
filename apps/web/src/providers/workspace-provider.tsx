'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useCreateWorkspace, useWorkspaces } from '@/features/workspaces/api/workspace-hooks';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkspaceStore } from '@/stores/workspace-store';

export function WorkspaceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const { hydrated, accessToken, user } = useAuthStore();
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const setCurrentWorkspaceId = useWorkspaceStore((state) => state.setCurrentWorkspaceId);
  const enabled = hydrated && Boolean(accessToken) && pathname !== '/invitations/accept';
  const workspaces = useWorkspaces(enabled);
  const createWorkspace = useCreateWorkspace();

  useEffect(() => {
    if (!enabled || workspaces.isLoading || createWorkspace.isPending) return;
    const items = workspaces.data ?? [];
    if (items.length === 0) {
      const defaultName = user?.name ? `${user.name}'s Workspace` : 'My Workspace';
      createWorkspace.mutate(
        { name: defaultName, visibility: 'private' },
        { onSuccess: (workspace) => setCurrentWorkspaceId(workspace.id) },
      );
      return;
    }
    const selectedExists = items.some((workspace) => workspace.id === currentWorkspaceId);
    if (!selectedExists) setCurrentWorkspaceId(items[0]?.id ?? null);
  }, [
    createWorkspace,
    currentWorkspaceId,
    enabled,
    setCurrentWorkspaceId,
    user?.name,
    workspaces.data,
    workspaces.isLoading,
  ]);

  return children;
}
