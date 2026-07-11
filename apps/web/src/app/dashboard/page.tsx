'use client';

import { Building2, Plus, Shield, Users } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { SectionHeader } from '@/components/common/section-header';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CreateWorkspaceDialog } from '@/features/workspaces/components/create-workspace-dialog';
import { WorkspaceAvatar } from '@/features/workspaces/components/workspace-avatar';
import { useWorkspaces } from '@/features/workspaces/api/workspace-hooks';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function DashboardPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const workspaces = useWorkspaces();
  const items = workspaces.data ?? [];
  const current = items.find((workspace) => workspace.id === currentWorkspaceId) ?? items[0];

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Home</span>
          <span>/</span>
          <span className="text-slate-300">Dashboard</span>
        </div>
        <PageHeader
          eyebrow="Dashboard"
          title={current ? current.name : 'Workspace'}
          description={
            current
              ? `Your ${current.currentUserRole ?? 'member'} workspace for organization settings and team access.`
              : 'Your workspace is being prepared.'
          }
          actions={
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New workspace
            </Button>
          }
        />
        {workspaces.isLoading ? (
          <section className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <Card key={item} className="rounded-lg p-5">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="mt-3 h-3 w-full" />
              </Card>
            ))}
          </section>
        ) : items.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-lg p-5">
              <WorkspaceAvatar name={current?.name} logo={current?.logo} className="size-11" />
              <h2 className="mt-4 font-semibold">Current workspace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{current?.slug}</p>
            </Card>
            <Card className="rounded-lg p-5">
              <Shield className="size-10 text-emerald-300" />
              <h2 className="mt-4 font-semibold">Role</h2>
              <p className="mt-2 text-sm capitalize leading-6 text-slate-400">
                {current?.currentUserRole ?? 'member'}
              </p>
            </Card>
            <Card className="rounded-lg p-5">
              <Users className="size-10 text-sky-300" />
              <h2 className="mt-4 font-semibold">Access</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Invite and manage members from the workspace members page.
              </p>
            </Card>
          </section>
        ) : (
          <EmptyState
            icon={<Building2 className="mx-auto size-8 text-emerald-300" />}
            title="Creating your first workspace"
            description="Your default workspace will appear here in a moment."
          />
        )}
        <section>
          <Card className="rounded-lg p-6">
            <SectionHeader
              title="Workspace module"
              description="Organization identity, member access, invitations, and settings are now backed by the API."
            />
          </Card>
        </section>
      </div>
      <CreateWorkspaceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </main>
  );
}
