'use client';

import type { WorkspaceRole } from '@pm/types';
import { MoreHorizontal, Plus, Shield, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dropdown } from '@/components/ui/dropdown';
import {
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from '@/features/workspaces/api/workspace-hooks';
import { InviteMemberDialog } from '@/features/workspaces/components/invite-member-dialog';
import { useWorkspaceStore } from '@/stores/workspace-store';

const roleOptions = ['owner', 'admin', 'manager', 'member', 'guest'] satisfies WorkspaceRole[];

export default function WorkspaceMembersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const members = useMembers(workspaceId);
  const updateRole = useUpdateMemberRole(workspaceId);
  const removeMember = useRemoveMember(workspaceId);

  const changeRole = (memberId: string, role: WorkspaceRole) => {
    updateRole.mutate({ memberId, input: { role } });
  };

  const remove = (memberId: string) => {
    removeMember.mutate(memberId);
  };

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          eyebrow="Workspace"
          title="Members"
          description="Invite teammates and manage workspace roles."
          actions={
            <Button onClick={() => setInviteOpen(true)} disabled={!workspaceId}>
              <Plus className="size-4" />
              Invite
            </Button>
          }
        />
        {members.isLoading ? (
          <Card className="rounded-lg p-5">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 border-b border-white/10 py-4 last:border-0"
              >
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="mt-2 h-3 w-56" />
                </div>
              </div>
            ))}
          </Card>
        ) : members.isError ? (
          <ErrorState title="Unable to load members" description="Please refresh and try again." />
        ) : members.data && members.data.length > 0 ? (
          <Card className="overflow-hidden rounded-lg">
            <div className="divide-y divide-white/10">
              {members.data.map((member) => (
                <div key={member.id} className="flex items-center gap-4 p-4">
                  <Avatar name={member.user?.name} src={member.user?.avatar} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.user?.name ?? 'Member'}</p>
                    <p className="truncate text-xs text-slate-400">{member.user?.email}</p>
                  </div>
                  <div className="hidden items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs capitalize text-slate-300 sm:flex">
                    <Shield className="size-3.5" />
                    {member.role}
                  </div>
                  <Dropdown trigger={<MoreHorizontal className="size-5 text-slate-400" />}>
                    <div className="px-2 py-1 text-xs uppercase tracking-wide text-slate-500">
                      Role
                    </div>
                    {roleOptions.map((role) => (
                      <button
                        type="button"
                        key={role}
                        onClick={() => changeRole(member.id, role)}
                        className="flex w-full rounded-lg px-3 py-2 text-left text-sm capitalize text-slate-300 hover:bg-white/10 hover:text-white"
                      >
                        {role}
                      </button>
                    ))}
                    <div className="my-1 h-px bg-white/10" />
                    <button
                      type="button"
                      onClick={() => remove(member.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-200 hover:bg-red-500/10"
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </button>
                  </Dropdown>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={<Users className="mx-auto size-8 text-sky-300" />}
            title="No members yet"
            description="Invite teammates to start collaborating in this workspace."
          />
        )}
      </div>
      <InviteMemberDialog
        open={inviteOpen}
        workspaceId={workspaceId}
        onClose={() => setInviteOpen(false)}
      />
    </main>
  );
}
