'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useCreateTask } from '../api/task-hooks';
import type { TaskPriority } from '../types';

interface CreateTaskDialogProps {
  open: boolean;
  columnId: string | null;
  onClose: () => void;
}

export function CreateTaskDialog({ open, columnId, onClose }: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [labels, setLabels] = useState('');
  const createTask = useCreateTask(columnId);

  const submit = () => {
    createTask.mutate(
      {
        title,
        description: description.trim() ? description : null,
        priority,
        labels: labels
          .split(',')
          .map((label) => label.trim())
          .filter(Boolean),
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setPriority('medium');
          setLabels('');
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} title="Create task" onClose={onClose}>
      <div className="space-y-4">
        <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-28 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/30 focus:ring-2 focus:ring-white/10"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Priority</span>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-white/30"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <Input
          label="Labels"
          placeholder="frontend, launch"
          value={labels}
          onChange={(event) => setLabels(event.target.value)}
        />
        <Button
          type="button"
          className="w-full"
          disabled={!columnId || title.trim().length < 2}
          loading={createTask.isPending}
          onClick={submit}
        >
          <Plus className="size-4" />
          Create task
        </Button>
      </div>
    </Dialog>
  );
}
