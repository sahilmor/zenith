import { describe, expect, it } from 'vitest';
import { groupTasksByColumn, moveTaskInColumns, toReorderColumnsInput } from './task-ordering';
import type { Task } from '../types';

const makeTask = (id: string, columnId: string, order: number): Task => ({
  id,
  workspaceId: 'workspace',
  projectId: 'project',
  boardId: 'board',
  columnId,
  title: id,
  description: null,
  order,
  priority: 'medium',
  status: 'open',
  assigneeIds: [],
  reporterId: 'user',
  labels: [],
  dueDate: null,
  startDate: null,
  estimate: null,
  coverImage: null,
  taskTypeId: null,
  workflowId: null,
  workflowStateId: null,
  customFields: [],
  archived: false,
  createdBy: 'user',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const columns = [
  {
    id: 'todo',
    boardId: 'board',
    name: 'Todo',
    color: null,
    order: 0,
    limit: null,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'done',
    boardId: 'board',
    name: 'Done',
    color: null,
    order: 1,
    limit: null,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('task ordering utilities', () => {
  it('groups, moves, and serializes task order without duplicates', () => {
    const grouped = groupTasksByColumn(columns, [
      makeTask('task-1', 'todo', 0),
      makeTask('task-2', 'todo', 1),
      makeTask('task-3', 'done', 0),
    ]);
    const moved = moveTaskInColumns(grouped, 'task-1', 'done', 1);

    expect(moved.todo?.map((task) => task.id)).toEqual(['task-2']);
    expect(moved.done?.map((task) => task.id)).toEqual(['task-3', 'task-1']);
    expect(moved.done?.[1]).toMatchObject({ columnId: 'done', order: 1 });
    expect(toReorderColumnsInput(moved)).toEqual([
      { columnId: 'todo', taskIds: ['task-2'] },
      { columnId: 'done', taskIds: ['task-3', 'task-1'] },
    ]);
  });
});
