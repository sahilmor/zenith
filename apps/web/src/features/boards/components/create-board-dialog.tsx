'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useBoardStore } from '@/stores/board-store';
import { useCreateBoard } from '../api/board-hooks';

interface CreateBoardDialogProps {
  open: boolean;
  projectId: string | null;
  onClose: () => void;
}

export function CreateBoardDialog({ open, projectId, onClose }: CreateBoardDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const createBoard = useCreateBoard(projectId);
  const setSelectedBoardId = useBoardStore((state) => state.setSelectedBoardId);

  const submit = () => {
    createBoard.mutate(
      { name, description: description.trim() ? description : null, isDefault },
      {
        onSuccess: (board) => {
          if (projectId) setSelectedBoardId(projectId, board.id);
          setName('');
          setDescription('');
          setIsDefault(false);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} title="Create board" onClose={onClose}>
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
          />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm">
          Default board
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(event) => setIsDefault(event.target.checked)}
            className="size-4 accent-emerald-400"
          />
        </label>
        <Button
          type="button"
          className="w-full"
          disabled={!projectId || name.trim().length < 2}
          loading={createBoard.isPending}
          onClick={submit}
        >
          <Plus className="size-4" />
          Create board
        </Button>
      </div>
    </Dialog>
  );
}
