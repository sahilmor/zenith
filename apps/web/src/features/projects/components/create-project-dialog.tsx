'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useCreateProject } from '../api/project-hooks';

interface CreateProjectDialogProps {
  open: boolean;
  workspaceId: string | null;
  onClose: () => void;
}

export function CreateProjectDialog({ open, workspaceId, onClose }: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#22c55e');
  const createProject = useCreateProject(workspaceId);

  const submit = () => {
    createProject.mutate(
      {
        name,
        key,
        description: description.trim() ? description : null,
        color,
        visibility: 'private',
      },
      {
        onSuccess: () => {
          setName('');
          setKey('');
          setDescription('');
          setColor('#22c55e');
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} title="Create project" onClose={onClose}>
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <Input
          label="Key"
          value={key}
          onChange={(event) => setKey(event.target.value.toUpperCase())}
          maxLength={10}
          placeholder="WEB"
        />
        <Input label="Color" value={color} onChange={(event) => setColor(event.target.value)} />
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
          disabled={!workspaceId || name.trim().length < 2 || key.trim().length < 2}
          loading={createProject.isPending}
          onClick={submit}
        >
          <Plus className="size-4" />
          Create project
        </Button>
      </div>
    </Dialog>
  );
}
