'use client';

import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { Project } from '../types';

type ProjectDangerAction = 'archive' | 'restore' | 'delete';

interface ProjectDangerDialogProps {
  action: ProjectDangerAction | null;
  project: Project | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const copy = {
  archive: {
    title: 'Archive project',
    body: 'Archived projects stay visible but cannot be modified until restored.',
    button: 'Archive',
    icon: Archive,
    variant: 'destructive' as const,
  },
  restore: {
    title: 'Restore project',
    body: 'Restoring makes this project active and editable again.',
    button: 'Restore',
    icon: RotateCcw,
    variant: 'primary' as const,
  },
  delete: {
    title: 'Delete project',
    body: 'Deleting removes this project record. This action cannot be undone.',
    button: 'Delete',
    icon: Trash2,
    variant: 'destructive' as const,
  },
};

export function ProjectDangerDialog({
  action,
  project,
  loading,
  onClose,
  onConfirm,
}: ProjectDangerDialogProps) {
  const activeCopy = action ? copy[action] : null;
  const Icon = activeCopy?.icon;
  return (
    <Dialog
      open={Boolean(action && project)}
      title={activeCopy?.title ?? 'Project'}
      onClose={onClose}
    >
      {activeCopy && Icon ? (
        <div>
          <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <Icon className="mt-0.5 size-5 text-slate-300" />
            <div>
              <p className="font-medium">{project?.name}</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">{activeCopy.body}</p>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={activeCopy.variant}
              loading={Boolean(loading)}
              onClick={onConfirm}
            >
              {activeCopy.button}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
