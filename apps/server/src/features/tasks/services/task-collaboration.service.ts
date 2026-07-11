import type {
  TaskActivitySummary,
  TaskAttachmentSummary,
  TaskCommentSummary,
  TaskLabelSummary,
  TaskWatcherSummary,
  WorkspaceRole,
} from '@pm/types';
import { Types } from 'mongoose';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import {
  CloudinaryStorageService,
  type StorageService,
} from '../../../services/cloudinary.service.js';
import type { AttachmentDocument } from '../models/attachment.model.js';
import type { CommentDocument } from '../models/comment.model.js';
import type { TaskDocument } from '../models/task.model.js';
import type { TaskActivityDocument } from '../models/task-activity.model.js';
import type { TaskLabelDocument } from '../models/task-label.model.js';
import type { TaskWatcherDocument } from '../models/task-watcher.model.js';
import { TaskRepository } from '../repositories/task.repository.js';
import {
  AttachmentRepository,
  CommentRepository,
  TaskActivityRepository,
  TaskLabelRepository,
  TaskWatcherRepository,
} from '../repositories/task-collaboration.repository.js';
import { parseMentionedUserIds } from '../utils/mentions.js';
import type {
  CreateCommentInput,
  CreateLabelInput,
  CreateReplyInput,
  UpdateCommentInput,
  UpdateLabelInput,
} from '../validation/task-collaboration.validation.js';
import { isSupportedAttachment, maxAttachmentSize } from '../../../middleware/upload.middleware.js';
import { realtimeService } from '../../../sockets/realtime.service.js';
import { notificationService } from '../../notifications/services/notification.service.js';
import { automationService } from '../../ai/services/automation.service.js';
import { webhookService } from '../../ops/services/webhook.service.js';
import { entitlementService } from '../../billing/services/entitlement.service.js';

const taskWriteRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager', 'member']);

export class TaskCollaborationService {
  public constructor(
    private readonly tasks = new TaskRepository(),
    private readonly comments = new CommentRepository(),
    private readonly attachments = new AttachmentRepository(),
    private readonly activities = new TaskActivityRepository(),
    private readonly watchers = new TaskWatcherRepository(),
    private readonly labels = new TaskLabelRepository(),
    private readonly workspaces = new WorkspaceRepository(),
    private readonly storage: StorageService = new CloudinaryStorageService(),
  ) {}

  public async createComment(
    taskId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateCommentInput,
  ): Promise<TaskCommentSummary> {
    const task = await this.requireTaskWriteAccess(taskId, userId);
    const comment = await this.comments.create({
      taskId,
      authorId: userId,
      content: input.content,
      mentionedUserIds: parseMentionedUserIds(input.content).map((id) => new Types.ObjectId(id)),
    });
    await this.recordTaskActivity(task, userId, 'comment.added', {
      commentId: comment.id,
      mentionedUserIds: comment.mentionedUserIds.map((id) => id.toString()),
    });
    const summary = this.toCommentSummary(comment);
    realtimeService.emitMutation({
      resource: 'comment',
      action: 'created',
      workspaceId: task.workspaceId.toString(),
      projectId: task.projectId.toString(),
      boardId: task.boardId.toString(),
      taskId: task.id,
      actorId: userId.toString(),
      data: summary,
    });
    await Promise.all(
      comment.mentionedUserIds.map((recipientId) =>
        notificationService.create({
          userId: recipientId,
          workspaceId: task.workspaceId,
          projectId: task.projectId,
          taskId: task._id,
          actorId: userId,
          type: 'comment_mention',
          taskTitle: task.title,
        }),
      ),
    );
    void automationService.runForEvent({
      workspaceId: task.workspaceId,
      actorId: userId,
      trigger: 'comment_added',
      taskId: task._id,
      fields: {
        taskTitle: task.title,
        content: comment.content,
        mentionedUserIds: comment.mentionedUserIds.map((id) => id.toString()),
      },
    });
    void webhookService.emit({
      workspaceId: task.workspaceId,
      event: 'comment.created',
      payload: { comment: summary, taskId: task.id, actorId: userId.toString() },
    });
    return summary;
  }

  public async listComments(
    taskId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<TaskCommentSummary[]> {
    await this.requireTaskAccess(taskId, userId);
    const comments = await this.comments.listByTask(taskId);
    return comments.map((comment) => this.toCommentSummary(comment));
  }

  public async updateComment(
    commentId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdateCommentInput,
  ): Promise<TaskCommentSummary> {
    const comment = await this.requireCommentAuthor(commentId, userId);
    const updated = await this.comments.update(
      commentId,
      input.content,
      parseMentionedUserIds(input.content).map((id) => new Types.ObjectId(id)),
    );
    if (!updated) throw new NotFoundError('Comment not found');
    const task = await this.requireTaskAccess(comment.taskId, userId);
    await this.recordTaskActivity(task, userId, 'comment.updated', { commentId: comment.id });
    const summary = this.toCommentSummary(updated);
    realtimeService.emitMutation({
      resource: 'comment',
      action: 'updated',
      workspaceId: task.workspaceId.toString(),
      projectId: task.projectId.toString(),
      boardId: task.boardId.toString(),
      taskId: task.id,
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async deleteComment(commentId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    const comment = await this.requireCommentAuthor(commentId, userId);
    await this.comments.delete(commentId);
    const task = await this.requireTaskAccess(comment.taskId, userId);
    await this.recordTaskActivity(task, userId, 'comment.deleted', { commentId: comment.id });
    realtimeService.emitMutation({
      resource: 'comment',
      action: 'deleted',
      workspaceId: task.workspaceId.toString(),
      projectId: task.projectId.toString(),
      boardId: task.boardId.toString(),
      taskId: task.id,
      actorId: userId.toString(),
      data: { commentId: comment.id },
    });
  }

  public async createReply(
    commentId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateReplyInput,
  ): Promise<TaskCommentSummary> {
    const parent = await this.comments.findById(commentId);
    if (!parent) throw new NotFoundError('Comment not found');
    const task = await this.requireTaskWriteAccess(parent.taskId, userId);
    const reply = await this.comments.create({
      taskId: parent.taskId,
      parentCommentId: commentId,
      authorId: userId,
      content: input.content,
      mentionedUserIds: parseMentionedUserIds(input.content).map((id) => new Types.ObjectId(id)),
    });
    await this.recordTaskActivity(task, userId, 'comment.replied', {
      commentId: reply.id,
      parentCommentId: parent.id,
    });
    const summary = this.toCommentSummary(reply);
    realtimeService.emitMutation({
      resource: 'comment',
      action: 'created',
      workspaceId: task.workspaceId.toString(),
      projectId: task.projectId.toString(),
      boardId: task.boardId.toString(),
      taskId: task.id,
      actorId: userId.toString(),
      data: summary,
    });
    await notificationService.create({
      userId: parent.authorId,
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      taskId: task._id,
      actorId: userId,
      type: 'comment_reply',
      taskTitle: task.title,
    });
    return summary;
  }

  public async uploadAttachment(
    taskId: Types.ObjectId,
    userId: Types.ObjectId,
    file: Express.Multer.File | undefined,
  ): Promise<TaskAttachmentSummary> {
    if (!file) throw new BadRequestError('Attachment file is required');
    this.validateAttachment(file);
    const task = await this.requireTaskWriteAccess(taskId, userId);
    await entitlementService.requireWithinLimit(task.workspaceId, 'storageBytes', file.size);
    const upload = await this.storage.uploadBuffer(file, `zenith/tasks/${task.id}`);
    const attachment = await this.attachments.create({
      taskId,
      uploadedBy: userId,
      fileName: file.originalname,
      originalName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      cloudinaryPublicId: upload.publicId,
      url: upload.secureUrl,
    });
    await this.recordTaskActivity(task, userId, 'attachment.uploaded', {
      attachmentId: attachment.id,
      fileName: attachment.originalName,
    });
    const summary = this.toAttachmentSummary(attachment);
    realtimeService.emitMutation({
      resource: 'attachment',
      action: 'uploaded',
      workspaceId: task.workspaceId.toString(),
      projectId: task.projectId.toString(),
      boardId: task.boardId.toString(),
      taskId: task.id,
      actorId: userId.toString(),
      data: summary,
    });
    await Promise.all(
      task.assigneeIds.map((assigneeId) =>
        notificationService.create({
          userId: assigneeId,
          workspaceId: task.workspaceId,
          projectId: task.projectId,
          taskId: task._id,
          actorId: userId,
          type: 'attachment_uploaded',
          taskTitle: task.title,
          fileName: attachment.originalName,
        }),
      ),
    );
    void automationService.runForEvent({
      workspaceId: task.workspaceId,
      actorId: userId,
      trigger: 'attachment_uploaded',
      taskId: task._id,
      fields: {
        taskTitle: task.title,
        fileName: attachment.originalName,
        fileType: attachment.fileType,
      },
    });
    void webhookService.emit({
      workspaceId: task.workspaceId,
      event: 'attachment.uploaded',
      payload: { attachment: summary, taskId: task.id, actorId: userId.toString() },
    });
    return summary;
  }

  public async listAttachments(
    taskId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<TaskAttachmentSummary[]> {
    await this.requireTaskAccess(taskId, userId);
    const attachments = await this.attachments.listByTask(taskId);
    return attachments.map((attachment) => this.toAttachmentSummary(attachment));
  }

  public async deleteAttachment(
    attachmentId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    const attachment = await this.attachments.findById(attachmentId);
    if (!attachment) throw new NotFoundError('Attachment not found');
    const task = await this.requireTaskWriteAccess(attachment.taskId, userId);
    await this.storage.deleteAsset(attachment.cloudinaryPublicId);
    await this.attachments.delete(attachmentId);
    await this.recordTaskActivity(task, userId, 'attachment.deleted', {
      attachmentId: attachment.id,
      fileName: attachment.originalName,
    });
    realtimeService.emitMutation({
      resource: 'attachment',
      action: 'removed',
      workspaceId: task.workspaceId.toString(),
      projectId: task.projectId.toString(),
      boardId: task.boardId.toString(),
      taskId: task.id,
      actorId: userId.toString(),
      data: { attachmentId: attachment.id },
    });
  }

  public async listActivity(
    taskId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<TaskActivitySummary[]> {
    await this.requireTaskAccess(taskId, userId);
    const activity = await this.activities.listByTask(taskId);
    return activity.map((item) => this.toActivitySummary(item));
  }

  public async watchTask(
    taskId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<TaskWatcherSummary> {
    const task = await this.requireTaskAccess(taskId, userId);
    const watcher = await this.watchers.watch(taskId, userId);
    await this.recordTaskActivity(task, userId, 'task.watched', {});
    const summary = this.toWatcherSummary(watcher);
    realtimeService.emitMutation({
      resource: 'watcher',
      action: 'created',
      workspaceId: task.workspaceId.toString(),
      projectId: task.projectId.toString(),
      boardId: task.boardId.toString(),
      taskId: task.id,
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async unwatchTask(taskId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    const task = await this.requireTaskAccess(taskId, userId);
    await this.watchers.unwatch(taskId, userId);
    await this.recordTaskActivity(task, userId, 'task.unwatched', {});
    realtimeService.emitMutation({
      resource: 'watcher',
      action: 'deleted',
      workspaceId: task.workspaceId.toString(),
      projectId: task.projectId.toString(),
      boardId: task.boardId.toString(),
      taskId: task.id,
      actorId: userId.toString(),
      data: { userId: userId.toString() },
    });
  }

  public async listLabels(
    taskId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<TaskLabelSummary[]> {
    const task = await this.requireTaskAccess(taskId, userId);
    const labels = await this.labels.listByWorkspace(task.workspaceId);
    const assigned = new Set(task.labelIds.map((id) => id.toString()));
    return labels
      .filter((label) => assigned.has(label.id))
      .map((label) => this.toLabelSummary(label));
  }

  public async createAndAssignLabel(
    taskId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateLabelInput,
  ): Promise<TaskLabelSummary> {
    const task = await this.requireTaskWriteAccess(taskId, userId);
    const existing = await this.labels.findByWorkspaceAndName(task.workspaceId, input.name);
    const label =
      existing ??
      (await this.labels.create({
        workspaceId: task.workspaceId,
        name: input.name,
        color: input.color,
        createdBy: userId,
      }));
    await this.assignLabel(task, userId, label);
    const summary = this.toLabelSummary(label);
    realtimeService.emitMutation({
      resource: 'label',
      action: 'created',
      workspaceId: task.workspaceId.toString(),
      projectId: task.projectId.toString(),
      boardId: task.boardId.toString(),
      taskId: task.id,
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async updateLabel(
    labelId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdateLabelInput,
  ): Promise<TaskLabelSummary> {
    const label = await this.labels.findById(labelId);
    if (!label) throw new NotFoundError('Label not found');
    await this.requireWorkspaceRole(label.workspaceId, userId, taskWriteRoles);
    const update: { name?: string; color?: string } = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.color !== undefined) update.color = input.color;
    const updated = await this.labels.update(labelId, update);
    if (!updated) throw new NotFoundError('Label not found');
    const summary = this.toLabelSummary(updated);
    realtimeService.emitMutation({
      resource: 'label',
      action: 'updated',
      workspaceId: summary.workspaceId,
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async removeLabel(
    taskId: Types.ObjectId,
    labelId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    const task = await this.requireTaskWriteAccess(taskId, userId);
    const label = await this.labels.findById(labelId);
    if (!label) throw new NotFoundError('Label not found');
    await this.tasks.update(taskId, {
      labelIds: task.labelIds.filter((id) => id.toString() !== labelId.toString()),
      labels: task.labels.filter((name) => name !== label.name),
    });
    await this.recordTaskActivity(task, userId, 'label.removed', {
      labelId: label.id,
      name: label.name,
    });
    realtimeService.emitMutation({
      resource: 'label',
      action: 'removed',
      workspaceId: task.workspaceId.toString(),
      projectId: task.projectId.toString(),
      boardId: task.boardId.toString(),
      taskId: task.id,
      actorId: userId.toString(),
      data: { labelId: label.id },
    });
  }

  private validateAttachment(file: Express.Multer.File): void {
    if (!isSupportedAttachment(file)) throw new BadRequestError('Unsupported attachment type');
    if (file.size > maxAttachmentSize) throw new BadRequestError('Attachment exceeds maximum size');
  }

  private async assignLabel(
    task: TaskDocument,
    userId: Types.ObjectId,
    label: TaskLabelDocument,
  ): Promise<void> {
    const labelIds = new Set(task.labelIds.map((id) => id.toString()));
    labelIds.add(label.id);
    const labelNames = new Set(task.labels);
    labelNames.add(label.name);
    await this.tasks.update(task._id, {
      labelIds: [...labelIds].map((id) => new Types.ObjectId(id)),
      labels: [...labelNames],
    });
    await this.recordTaskActivity(task, userId, 'label.added', {
      labelId: label.id,
      name: label.name,
    });
  }

  private async requireTaskAccess(
    taskId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<TaskDocument> {
    const task = await this.tasks.findById(taskId);
    if (!task) throw new NotFoundError('Task not found');
    await this.requireWorkspaceMembership(task.workspaceId, userId);
    return task;
  }

  private async requireTaskWriteAccess(
    taskId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<TaskDocument> {
    const task = await this.requireTaskAccess(taskId, userId);
    if (task.archived) throw new ForbiddenError('Archived tasks cannot be modified');
    await this.requireWorkspaceRole(task.workspaceId, userId, taskWriteRoles);
    return task;
  }

  private async requireCommentAuthor(
    commentId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<CommentDocument> {
    const comment = await this.comments.findById(commentId);
    if (!comment) throw new NotFoundError('Comment not found');
    await this.requireTaskWriteAccess(comment.taskId, userId);
    if (comment.authorId.toString() !== userId.toString()) {
      throw new ForbiddenError('Only the comment author can change this comment');
    }
    return comment;
  }

  private async requireWorkspaceMembership(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<WorkspaceRole> {
    const [workspace, membership] = await Promise.all([
      this.workspaces.findWorkspaceById(workspaceId),
      this.workspaces.findMembership(workspaceId, userId),
    ]);
    if (!workspace || workspace.archived) throw new NotFoundError('Workspace not found');
    if (!membership || membership.status !== 'active')
      throw new ForbiddenError('Workspace access denied');
    return membership.role as WorkspaceRole;
  }

  private async requireWorkspaceRole(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    roles: ReadonlySet<WorkspaceRole>,
  ): Promise<void> {
    const role = await this.requireWorkspaceMembership(workspaceId, userId);
    if (!roles.has(role)) throw new ForbiddenError('Task collaboration access required');
  }

  private async recordTaskActivity(
    task: TaskDocument,
    userId: Types.ObjectId,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.activities.create({
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      boardId: task.boardId,
      taskId: task._id,
      userId,
      action,
      metadata,
    });
  }

  private toCommentSummary(comment: CommentDocument): TaskCommentSummary {
    return {
      id: comment.id,
      taskId: comment.taskId.toString(),
      parentCommentId: comment.parentCommentId?.toString() ?? null,
      authorId: comment.authorId.toString(),
      content: comment.content,
      mentionedUserIds: comment.mentionedUserIds.map((id) => id.toString()),
      editedAt: comment.editedAt?.toISOString() ?? null,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  private toAttachmentSummary(attachment: AttachmentDocument): TaskAttachmentSummary {
    return {
      id: attachment.id,
      taskId: attachment.taskId.toString(),
      uploadedBy: attachment.uploadedBy.toString(),
      fileName: attachment.fileName,
      originalName: attachment.originalName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
      cloudinaryPublicId: attachment.cloudinaryPublicId,
      url: attachment.url,
      createdAt: attachment.createdAt.toISOString(),
    };
  }

  private toActivitySummary(activity: TaskActivityDocument): TaskActivitySummary {
    return {
      id: activity.id,
      workspaceId: activity.workspaceId.toString(),
      projectId: activity.projectId.toString(),
      boardId: activity.boardId.toString(),
      taskId: activity.taskId.toString(),
      userId: activity.userId.toString(),
      action: activity.action,
      metadata: activity.metadata as Record<string, unknown>,
      createdAt: activity.createdAt.toISOString(),
    };
  }

  private toWatcherSummary(watcher: TaskWatcherDocument): TaskWatcherSummary {
    return {
      id: watcher.id,
      taskId: watcher.taskId.toString(),
      userId: watcher.userId.toString(),
      createdAt: watcher.createdAt.toISOString(),
    };
  }

  private toLabelSummary(label: TaskLabelDocument): TaskLabelSummary {
    return {
      id: label.id,
      workspaceId: label.workspaceId.toString(),
      name: label.name,
      color: label.color,
      createdBy: label.createdBy.toString(),
      createdAt: label.createdAt.toISOString(),
      updatedAt: label.updatedAt.toISOString(),
    };
  }
}
