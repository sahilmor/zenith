'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useCreateWorkspace } from '../api/workspace-hooks';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateWorkspaceDialog({ open, onClose }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const setCurrentWorkspaceId = useWorkspaceStore((state) => state.setCurrentWorkspaceId);
  const createWorkspace = useCreateWorkspace();

  const submit = () => {
    createWorkspace.mutate(
      {
        name,
        description: description.trim() ? description : null,
        visibility: 'private',
      },
      {
        onSuccess: (workspace) => {
          setCurrentWorkspaceId(workspace.id);
          setName('');
          setDescription('');
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} title="Create workspace" onClose={onClose}>
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/30 focus:ring-2 focus:ring-white/10"
          />
        </label>
        <Button
          type="button"
          className="w-full"
          disabled={name.trim().length < 2}
          loading={createWorkspace.isPending}
          onClick={submit}
        >
          <Plus className="size-4" />
          Create workspace
        </Button>
      </div>
    </Dialog>
  );
}
