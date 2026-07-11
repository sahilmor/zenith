import type { NotificationType } from '@pm/types';

export interface NotificationFactoryInput {
  readonly type: NotificationType;
  readonly title?: string;
  readonly message?: string;
  readonly actorName?: string;
  readonly taskTitle?: string;
  readonly workspaceName?: string;
  readonly projectName?: string;
  readonly boardName?: string;
  readonly fileName?: string;
}

const fallbackTitleByType: Record<NotificationType, string> = {
  task_assigned: 'Task assigned',
  task_unassigned: 'Task unassigned',
  task_mention: 'You were mentioned',
  comment_mention: 'You were mentioned in a comment',
  comment_reply: 'New reply',
  task_moved: 'Task moved',
  task_due_soon: 'Task due soon',
  task_overdue: 'Task overdue',
  workspace_invitation: 'Workspace invitation',
  workspace_role_changed: 'Workspace role changed',
  project_created: 'Project created',
  board_created: 'Board created',
  attachment_uploaded: 'Attachment uploaded',
  task_archived: 'Task archived',
  task_restored: 'Task restored',
  system_announcement: 'Announcement',
};

export const createNotificationContent = (
  input: NotificationFactoryInput,
): { title: string; message: string } => {
  if (input.title && input.message) return { title: input.title, message: input.message };
  const actor = input.actorName ?? 'Someone';
  const task = input.taskTitle ?? 'a task';
  const workspace = input.workspaceName ?? 'a workspace';
  const project = input.projectName ?? 'a project';
  const board = input.boardName ?? 'a board';
  const file = input.fileName ?? 'a file';

  const messageByType: Record<NotificationType, string> = {
    task_assigned: `${actor} assigned you to ${task}.`,
    task_unassigned: `${actor} removed you from ${task}.`,
    task_mention: `${actor} mentioned you in ${task}.`,
    comment_mention: `${actor} mentioned you in a comment on ${task}.`,
    comment_reply: `${actor} replied to your comment on ${task}.`,
    task_moved: `${actor} moved ${task}.`,
    task_due_soon: `${task} is due soon.`,
    task_overdue: `${task} is overdue.`,
    workspace_invitation: `${actor} invited you to ${workspace}.`,
    workspace_role_changed: `${actor} changed your role in ${workspace}.`,
    project_created: `${actor} created ${project}.`,
    board_created: `${actor} created ${board}.`,
    attachment_uploaded: `${actor} uploaded ${file} to ${task}.`,
    task_archived: `${actor} archived ${task}.`,
    task_restored: `${actor} restored ${task}.`,
    system_announcement: input.message ?? 'There is a new system announcement.',
  };

  return {
    title: input.title ?? fallbackTitleByType[input.type],
    message: input.message ?? messageByType[input.type],
  };
};

export const notificationCategoryForType = (
  type: NotificationType,
): 'assignments' | 'comments' | 'mentions' | 'dueDates' | 'workspace' | 'inApp' => {
  if (type === 'task_assigned' || type === 'task_unassigned') return 'assignments';
  if (type === 'comment_reply' || type === 'attachment_uploaded') return 'comments';
  if (type === 'task_mention' || type === 'comment_mention') return 'mentions';
  if (type === 'task_due_soon' || type === 'task_overdue') return 'dueDates';
  if (type === 'workspace_invitation' || type === 'workspace_role_changed') return 'workspace';
  return 'inApp';
};
