import type {
  SubtaskSummary,
  TaskActivitySummary,
  TaskAttachmentSummary,
  TaskCommentSummary,
  TaskLabelSummary,
  TaskListSummary,
  TaskPriority,
  TaskStatus,
  TaskSummary,
  TaskWatcherSummary,
} from '@pm/types';

export type Task = TaskSummary;
export type TaskList = TaskListSummary;
export type Subtask = SubtaskSummary;
export type TaskComment = TaskCommentSummary;
export type TaskAttachment = TaskAttachmentSummary;
export type TaskActivity = TaskActivitySummary;
export type TaskLabel = TaskLabelSummary;
export type TaskWatcher = TaskWatcherSummary;
export type { TaskPriority, TaskStatus };

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: Exclude<TaskStatus, 'archived'>;
  assigneeIds?: string[];
  labels?: string[];
  dueDate?: string | null;
  startDate?: string | null;
  estimate?: number | null;
  coverImage?: string | null;
  taskTypeId?: string | null;
  customFields?: Record<string, unknown>;
}

export interface UpdateTaskInput {
  columnId?: string;
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  assigneeIds?: string[];
  labels?: string[];
  dueDate?: string | null;
  startDate?: string | null;
  estimate?: number | null;
  coverImage?: string | null;
  taskTypeId?: string | null;
  customFields?: Record<string, unknown>;
}

export interface TaskFilters {
  page?: number | undefined;
  limit?: number | undefined;
  workspaceId?: string | undefined;
  projectId?: string | undefined;
  boardId?: string | undefined;
  columnId?: string | undefined;
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  assigneeId?: string | undefined;
  reporterId?: string | undefined;
  createdBy?: string | undefined;
  watchingUserId?: string | undefined;
  labels?: string[] | undefined;
  dueFrom?: string | undefined;
  dueTo?: string | undefined;
  archived?: boolean | undefined;
  search?: string | undefined;
  sort?: 'priority' | 'dueDate' | 'createdAt' | 'updatedAt' | 'title' | 'manual' | undefined;
  direction?: 'asc' | 'desc' | undefined;
}

export interface BulkUpdateTasksInput {
  taskIds: string[];
  columnId?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assigneeIds?: string[];
  labels?: string[];
  dueDate?: string | null;
  startDate?: string | null;
  archived?: boolean;
}

export interface ReorderTaskColumnInput {
  columnId: string;
  taskIds: string[];
}

export interface ReorderTasksInput {
  boardId: string;
  columns: ReorderTaskColumnInput[];
}

export interface CreateSubtaskInput {
  title: string;
  completed?: boolean;
}

export interface UpdateSubtaskInput {
  title?: string;
  completed?: boolean;
  order?: number;
}

export interface CreateCommentInput {
  content: string;
}

export interface UpdateCommentInput {
  content: string;
}

export interface CreateLabelInput {
  name: string;
  color?: string;
}

export interface UpdateLabelInput {
  name?: string;
  color?: string;
}
