'use client';

import type { WorkspaceRole } from '@pm/types';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useInviteMember } from '../api/workspace-hooks';

const inviteRoles = ['admin', 'manager', 'member', 'guest'] satisfies WorkspaceRole[];

interface InviteMemberDialogProps {
  open: boolean;
  workspaceId: string | null;
  onClose: () => void;
}

export function InviteMemberDialog({ open, workspaceId, onClose }: InviteMemberDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('member');
  const invite = useInviteMember(workspaceId);

  const submit = () => {
    invite.mutate(
      { email, role: role as Exclude<WorkspaceRole, 'owner'> },
      {
        onSuccess: () => {
          setEmail('');
          setRole('member');
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} title="Invite member" onClose={onClose}>
      <div className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Role</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as WorkspaceRole)}
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
          >
            {inviteRoles.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          className="w-full"
          disabled={!workspaceId || !email.includes('@')}
          loading={invite.isPending}
          onClick={submit}
        >
          <Send className="size-4" />
          Send invitation
        </Button>
      </div>
    </Dialog>
  );
}
