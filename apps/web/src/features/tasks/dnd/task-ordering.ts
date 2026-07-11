import type { BoardColumn } from '@/features/boards/types';
import type { ReorderTaskColumnInput, Task } from '../types';

export type TasksByColumn = Record<string, Task[]>;

export interface TaskLocation {
  columnId: string;
  index: number;
}

export const groupTasksByColumn = (columns: BoardColumn[], tasks: Task[]): TasksByColumn =>
  columns.reduce<TasksByColumn>((accumulator, column) => {
    accumulator[column.id] = tasks
      .filter((task) => task.columnId === column.id && !task.archived)
      .sort((first, second) => first.order - second.order);
    return accumulator;
  }, {});

export const findTaskLocation = (
  tasksByColumn: TasksByColumn,
  taskId: string,
): TaskLocation | null => {
  for (const [columnId, tasks] of Object.entries(tasksByColumn)) {
    const index = tasks.findIndex((task) => task.id === taskId);
    if (index >= 0) return { columnId, index };
  }
  return null;
};

export const moveTaskInColumns = (
  tasksByColumn: TasksByColumn,
  taskId: string,
  destinationColumnId: string,
  destinationIndex: number,
): TasksByColumn => {
  const source = findTaskLocation(tasksByColumn, taskId);
  if (!source) return tasksByColumn;
  const next = Object.fromEntries(
    Object.entries(tasksByColumn).map(([columnId, tasks]) => [columnId, [...tasks]]),
  ) as TasksByColumn;
  const [task] = next[source.columnId]?.splice(source.index, 1) ?? [];
  if (!task) return tasksByColumn;
  const destination = next[destinationColumnId] ?? [];
  destination.splice(destinationIndex, 0, { ...task, columnId: destinationColumnId });
  next[destinationColumnId] = destination;
  return normalizeTaskOrders(next);
};

export const normalizeTaskOrders = (tasksByColumn: TasksByColumn): TasksByColumn =>
  Object.fromEntries(
    Object.entries(tasksByColumn).map(([columnId, tasks]) => [
      columnId,
      tasks.map((task, order) => ({ ...task, columnId, order })),
    ]),
  ) as TasksByColumn;

export const toReorderColumnsInput = (tasksByColumn: TasksByColumn): ReorderTaskColumnInput[] =>
  Object.entries(tasksByColumn).map(([columnId, tasks]) => ({
    columnId,
    taskIds: tasks.map((task) => task.id),
  }));

export const flattenTasksByColumn = (tasksByColumn: TasksByColumn): Task[] =>
  Object.values(tasksByColumn).flat();
