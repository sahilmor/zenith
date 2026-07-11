'use client';

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { BoardColumn } from '@/features/boards/types';
import {
  findTaskLocation,
  flattenTasksByColumn,
  groupTasksByColumn,
  moveTaskInColumns,
  toReorderColumnsInput,
  type TasksByColumn,
} from '../dnd/task-ordering';
import type { Task } from '../types';
import { TaskCard } from './task-card';

interface KanbanBoardProps {
  boardId: string;
  columns: BoardColumn[];
  tasks: Task[];
  disabled: boolean;
  onCreateTask: (columnId: string) => void;
  onOpenTask: (task: Task) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onArchiveColumn: (columnId: string) => void;
  onReorder: (tasksByColumn: TasksByColumn) => void;
}

interface KanbanColumnProps {
  column: BoardColumn;
  tasks: Task[];
  disabled: boolean;
  onCreateTask: (columnId: string) => void;
  onOpenTask: (task: Task) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onArchiveColumn: (columnId: string) => void;
}

function KanbanColumn({
  column,
  tasks,
  disabled,
  onCreateTask,
  onOpenTask,
  onRenameColumn,
  onArchiveColumn,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
    disabled: Boolean(disabled),
  });

  return (
    <Card
      className="flex max-h-[calc(100vh-17rem)] min-h-[28rem] min-w-72 flex-col rounded-lg p-3"
      style={{ borderColor: column.color ?? undefined }}
    >
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <input
            value={column.name}
            disabled={disabled || column.archived}
            onChange={(event) => onRenameColumn(column.id, event.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-white outline-none disabled:text-slate-500"
            aria-label={`Rename ${column.name}`}
          />
          <p className="mt-1 text-xs text-slate-500">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            {column.limit ? ` / ${column.limit}` : ''}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onArchiveColumn(column.id)}
          disabled={disabled || column.archived}
          aria-label="Archive column"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`mt-3 flex-1 space-y-3 overflow-y-auto rounded-lg border border-dashed p-2 transition ${
            isOver ? 'border-emerald-300/60 bg-emerald-300/5' : 'border-white/5 bg-black/10'
          }`}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
          ))}
          {tasks.length === 0 ? (
            <div className="grid min-h-28 place-items-center rounded-lg border border-white/5 text-xs text-slate-500">
              Empty
            </div>
          ) : null}
        </div>
      </SortableContext>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3"
        disabled={disabled || column.archived}
        onClick={() => onCreateTask(column.id)}
      >
        <Plus className="size-4" />
        Task
      </Button>
    </Card>
  );
}

export function KanbanBoard({
  boardId,
  columns,
  tasks,
  disabled,
  onCreateTask,
  onOpenTask,
  onRenameColumn,
  onArchiveColumn,
  onReorder,
}: KanbanBoardProps) {
  const isDisabled = Boolean(disabled);
  const activeColumns = useMemo(() => columns.filter((column) => !column.archived), [columns]);
  const [tasksByColumn, setTasksByColumn] = useState<TasksByColumn>(() =>
    groupTasksByColumn(activeColumns, tasks),
  );
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setTasksByColumn(groupTasksByColumn(activeColumns, tasks));
  }, [activeColumns, tasks]);

  const findDestination = (overId: string) => {
    if (tasksByColumn[overId]) {
      return { columnId: overId, index: tasksByColumn[overId]?.length ?? 0 };
    }
    const location = findTaskLocation(tasksByColumn, overId);
    return location ? { columnId: location.columnId, index: location.index } : null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = flattenTasksByColumn(tasksByColumn).find((item) => item.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) return;

    const destination = findDestination(overId);
    if (!destination) return;
    const next = moveTaskInColumns(
      tasksByColumn,
      activeId,
      destination.columnId,
      destination.index,
    );
    if (next === tasksByColumn) return;
    setTasksByColumn(next);
    onReorder(next);
  };

  return (
    <DndContext
      id={`board-${boardId}`}
      sensors={sensors}
      collisionDetection={closestCorners}
      autoScroll
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <section className="flex gap-4 overflow-x-auto pb-4" aria-label="Kanban board">
        {activeColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByColumn[column.id] ?? []}
            disabled={isDisabled}
            onCreateTask={onCreateTask}
            onOpenTask={onOpenTask}
            onRenameColumn={onRenameColumn}
            onArchiveColumn={onArchiveColumn}
          />
        ))}
      </section>
      <DragOverlay>
        {activeTask ? (
          <div className="w-72">
            <TaskCard task={activeTask} onOpen={onOpenTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export { toReorderColumnsInput };
