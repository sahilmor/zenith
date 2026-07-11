'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useCreateColumn } from '../api/board-hooks';

interface CreateColumnDialogProps {
  open: boolean;
  boardId: string | null;
  onClose: () => void;
}

export function CreateColumnDialog({ open, boardId, onClose }: CreateColumnDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#64748b');
  const [limit, setLimit] = useState('');
  const createColumn = useCreateColumn(boardId);

  const submit = () => {
    createColumn.mutate(
      {
        name,
        color,
        limit: limit.trim() ? Number(limit) : null,
      },
      {
        onSuccess: () => {
          setName('');
          setColor('#64748b');
          setLimit('');
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} title="Create column" onClose={onClose}>
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <Input label="Color" value={color} onChange={(event) => setColor(event.target.value)} />
        <Input
          label="WIP limit"
          type="number"
          min={1}
          value={limit}
          onChange={(event) => setLimit(event.target.value)}
        />
        <Button
          type="button"
          className="w-full"
          disabled={!boardId || name.trim().length < 2}
          loading={createColumn.isPending}
          onClick={submit}
        >
          <Plus className="size-4" />
          Create column
        </Button>
      </div>
    </Dialog>
  );
}
