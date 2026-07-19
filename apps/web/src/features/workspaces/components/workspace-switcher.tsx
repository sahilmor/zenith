'use client';

import Link from 'next/link';
import { ChevronDown, Plus, Settings, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';
import { Skeleton } from '@/components/common/skeleton';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useWorkspaces } from '../api/workspace-hooks';
import { CreateWorkspaceDialog } from './create-workspace-dialog';
import { WorkspaceAvatar } from './workspace-avatar';

export function WorkspaceSwitcher() {
  const [createOpen, setCreateOpen] = useState(false);
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const setCurrentWorkspaceId = useWorkspaceStore((state) => state.setCurrentWorkspaceId);
  const workspaces = useWorkspaces();
  const items = workspaces.data ?? [];
  const current = items.find((workspace) => workspace.id === currentWorkspaceId) ?? items[0];

  if (workspaces.isLoading) {
    return (
      <div className="flex min-w-0 items-center gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-2">
        <Skeleton className="size-9 rounded-lg" />
        <Skeleton className="h-4 w-28" />
      </div>
    );
  }

  return (
    <>
      <Dropdown
        trigger={
          <div className="flex min-w-0 max-w-full items-center gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-2 text-left text-[var(--app-text)] transition hover:border-[var(--app-accent)] hover:bg-[var(--app-panel-soft)]">
            <WorkspaceAvatar name={current?.name} logo={current?.logo} />
            <div className="hidden min-w-0 flex-1 sm:block">
              <p className="truncate text-sm font-medium">{current?.name ?? 'Workspace'}</p>
              <p className="truncate text-xs text-[var(--app-muted)]">
                {current?.currentUserRole ?? 'member'}
              </p>
            </div>
            <ChevronDown className="size-4 shrink-0 text-[var(--app-muted)]" />
          </div>
        }
      >
        <div className="app-scrollbar max-h-72 overflow-y-auto">
          {items.map((workspace) => (
            <button
              type="button"
              key={workspace.id}
              onClick={() => setCurrentWorkspaceId(workspace.id)}
              className={cn(
                'flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[var(--app-muted)] hover:bg-[var(--app-panel-soft)] hover:text-[var(--app-text)]',
                workspace.id === current?.id && 'bg-[var(--app-panel-soft)] text-[var(--app-text)]',
              )}
            >
              <WorkspaceAvatar name={workspace.name} logo={workspace.logo} className="size-7" />
              <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
            </button>
          ))}
        </div>
        <div className="my-2 h-px bg-[var(--app-border)]" />
        {current ? (
          <>
            <Link
              href="/dashboard/workspace/members"
              className="flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--app-muted)] hover:bg-[var(--app-panel-soft)] hover:text-[var(--app-text)]"
            >
              <Users className="size-4" />
              Members
            </Link>
            <Link
              href="/dashboard/workspace/settings"
              className="flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--app-muted)] hover:bg-[var(--app-panel-soft)] hover:text-[var(--app-text)]"
            >
              <Settings className="size-4" />
              Settings
            </Link>
          </>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 w-full justify-start rounded-lg"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          New workspace
        </Button>
      </Dropdown>
      <CreateWorkspaceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
