'use client';

import { CSS } from '@dnd-kit/utilities';
import { CalendarClock, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import type { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onOpen: (task: Task) => void;
}

const priorityStyles = {
  low: 'bg-slate-500/15 text-slate-300',
  medium: 'bg-sky-500/15 text-sky-200',
  high: 'bg-amber-500/15 text-amber-200',
  urgent: 'bg-red-500/15 text-red-200',
};

export function TaskCard({ task, onOpen }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-lg border border-white/10 bg-slate-950/90 p-3 shadow-lg shadow-black/15 outline-none transition hover:border-white/20',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 rounded-md p-1 text-slate-500 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label={`Drag ${task.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen(task)}
          aria-label={`Open task ${task.title}`}
        >
          <h3 className="break-words text-sm font-medium leading-5 text-white">{task.title}</h3>
          {task.description ? (
            <p className="mt-2 line-clamp-2 break-words text-xs leading-5 text-slate-400">
              {task.description}
            </p>
          ) : null}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-md px-2 py-1 text-[11px] font-medium',
            priorityStyles[task.priority],
          )}
        >
          {task.priority}
        </span>
        {task.dueDate ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-1 text-[11px] text-slate-300">
            <CalendarClock className="size-3" />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        ) : null}
        {task.labels.slice(0, 3).map((label) => (
          <span
            key={label}
            className="rounded-md bg-white/[0.04] px-2 py-1 text-[11px] text-slate-300"
          >
            {label}
          </span>
        ))}
      </div>
    </article>
  );
}
