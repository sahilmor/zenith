'use client';

import { cn } from '@/lib/utils';
import type { Board } from '../types';

interface BoardSelectorProps {
  boards: Board[];
  selectedBoardId: string | null;
  onSelect: (boardId: string) => void;
}

export function BoardSelector({ boards, selectedBoardId, onSelect }: BoardSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {boards.map((board) => (
        <button
          type="button"
          key={board.id}
          onClick={() => onSelect(board.id)}
          className={cn(
            'shrink-0 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-white',
            board.id === selectedBoardId && 'bg-white/10 text-white',
            board.archived && 'border-red-400/20 text-red-200',
          )}
        >
          {board.name}
        </button>
      ))}
    </div>
  );
}
