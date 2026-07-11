'use client';

import { Archive, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useDeleteWorkspace,
  useUpdateWorkspace,
  useWorkspace,
} from '@/features/workspaces/api/workspace-hooks';
import { WorkspaceAvatar } from '@/features/workspaces/components/workspace-avatar';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function WorkspaceSettingsPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const setCurrentWorkspaceId = useWorkspaceStore((state) => state.setCurrentWorkspaceId);
  const workspace = useWorkspace(workspaceId);
  const updateWorkspace = useUpdateWorkspace(workspaceId);
  const deleteWorkspace = useDeleteWorkspace();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allowPublicDiscovery, setAllowPublicDiscovery] = useState(false);

  useEffect(() => {
    if (!workspace.data) return;
    setName(workspace.data.name);
    setDescription(workspace.data.description ?? '');
    setAllowPublicDiscovery(workspace.data.settings.allowPublicDiscovery);
  }, [workspace.data]);

  const save = () => {
    updateWorkspace.mutate({
      name,
      description: description.trim() ? description : null,
      settings: { allowPublicDiscovery },
    });
  };

  const archive = () => {
    if (!workspaceId) return;
    deleteWorkspace.mutate(workspaceId, {
      onSuccess: () => setCurrentWorkspaceId(null),
    });
  };

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Workspace"
          title="Settings"
          description="Manage organization identity and workspace-level preferences."
          actions={
            <Button onClick={save} loading={updateWorkspace.isPending} disabled={!workspace.data}>
              <Save className="size-4" />
              Save
            </Button>
          }
        />
        {workspace.isLoading ? (
          <Card className="rounded-lg p-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-4 h-11 w-full" />
          </Card>
        ) : workspace.isError ? (
          <ErrorState
            title="Unable to load workspace"
            description="Please refresh and try again."
          />
        ) : workspace.data ? (
          <div className="grid gap-6">
            <Card className="rounded-lg p-6">
              <div className="mb-6 flex items-center gap-4">
                <WorkspaceAvatar
                  name={workspace.data.name}
                  logo={workspace.data.logo}
                  className="size-12"
                />
                <div>
                  <h2 className="font-semibold">{workspace.data.name}</h2>
                  <p className="text-sm text-slate-400">{workspace.data.slug}</p>
                </div>
              </div>
              <div className="grid gap-4">
                <Input
                  label="Name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Description</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-28 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                  />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <span>
                    <span className="block text-sm font-medium">Public discovery</span>
                    <span className="text-xs text-slate-400">
                      Allow the workspace to be discoverable when public visibility is enabled.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={allowPublicDiscovery}
                    onChange={(event) => setAllowPublicDiscovery(event.target.checked)}
                    className="size-4 accent-emerald-400"
                  />
                </label>
              </div>
            </Card>
            <Card className="rounded-lg border-red-400/20 p-6">
              <h2 className="font-semibold text-red-200">Archive workspace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Archiving hides the workspace from active lists while preserving its records.
              </p>
              <Button
                type="button"
                variant="destructive"
                className="mt-4"
                loading={deleteWorkspace.isPending}
                onClick={archive}
              >
                <Archive className="size-4" />
                Archive
              </Button>
            </Card>
          </div>
        ) : null}
      </div>
    </main>
  );
}
