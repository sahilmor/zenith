import type { Types } from 'mongoose';
import { AttachmentModel, type AttachmentDocument } from '../models/attachment.model.js';
import { CommentModel, type CommentDocument } from '../models/comment.model.js';
import { TaskActivityModel, type TaskActivityDocument } from '../models/task-activity.model.js';
import { TaskLabelModel, type TaskLabelDocument } from '../models/task-label.model.js';
import { TaskWatcherModel, type TaskWatcherDocument } from '../models/task-watcher.model.js';

export class CommentRepository {
  public async create(input: {
    taskId: Types.ObjectId;
    parentCommentId?: Types.ObjectId | null;
    authorId: Types.ObjectId;
    content: string;
    mentionedUserIds: Types.ObjectId[];
  }): Promise<CommentDocument> {
    return CommentModel.create(input) as Promise<CommentDocument>;
  }

  public async findById(commentId: Types.ObjectId): Promise<CommentDocument | null> {
    return CommentModel.findById(commentId).exec() as Promise<CommentDocument | null>;
  }

  public async listByTask(taskId: Types.ObjectId): Promise<CommentDocument[]> {
    return CommentModel.find({ taskId }).sort({ createdAt: 1 }).exec() as Promise<
      CommentDocument[]
    >;
  }

  public async update(
    commentId: Types.ObjectId,
    content: string,
    mentionedUserIds: Types.ObjectId[],
  ) {
    return CommentModel.findByIdAndUpdate(
      commentId,
      { content, mentionedUserIds, editedAt: new Date() },
      { new: true },
    ).exec() as Promise<CommentDocument | null>;
  }

  public async delete(commentId: Types.ObjectId): Promise<CommentDocument | null> {
    return CommentModel.findByIdAndDelete(commentId).exec() as Promise<CommentDocument | null>;
  }
}

export class AttachmentRepository {
  public async create(input: {
    taskId: Types.ObjectId;
    uploadedBy: Types.ObjectId;
    fileName: string;
    originalName: string;
    fileType: string;
    fileSize: number;
    cloudinaryPublicId: string;
    url: string;
  }): Promise<AttachmentDocument> {
    return AttachmentModel.create(input) as Promise<AttachmentDocument>;
  }

  public async findById(attachmentId: Types.ObjectId): Promise<AttachmentDocument | null> {
    return AttachmentModel.findById(attachmentId).exec() as Promise<AttachmentDocument | null>;
  }

  public async listByTask(taskId: Types.ObjectId): Promise<AttachmentDocument[]> {
    return AttachmentModel.find({ taskId }).sort({ createdAt: -1 }).exec() as Promise<
      AttachmentDocument[]
    >;
  }

  public async delete(attachmentId: Types.ObjectId): Promise<AttachmentDocument | null> {
    return AttachmentModel.findByIdAndDelete(
      attachmentId,
    ).exec() as Promise<AttachmentDocument | null>;
  }
}

export class TaskActivityRepository {
  public async create(input: {
    workspaceId: Types.ObjectId;
    projectId: Types.ObjectId;
    boardId: Types.ObjectId;
    taskId: Types.ObjectId;
    userId: Types.ObjectId;
    action: string;
    metadata?: Record<string, unknown>;
  }): Promise<TaskActivityDocument> {
    return TaskActivityModel.create(input) as Promise<TaskActivityDocument>;
  }

  public async listByTask(taskId: Types.ObjectId): Promise<TaskActivityDocument[]> {
    return TaskActivityModel.find({ taskId }).sort({ createdAt: -1 }).exec() as Promise<
      TaskActivityDocument[]
    >;
  }
}

export class TaskWatcherRepository {
  public async watch(taskId: Types.ObjectId, userId: Types.ObjectId): Promise<TaskWatcherDocument> {
    return TaskWatcherModel.findOneAndUpdate(
      { taskId, userId },
      { taskId, userId },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec() as Promise<TaskWatcherDocument>;
  }

  public async unwatch(taskId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    await TaskWatcherModel.deleteOne({ taskId, userId }).exec();
  }
}

export class TaskLabelRepository {
  public async create(input: {
    workspaceId: Types.ObjectId;
    name: string;
    color: string;
    createdBy: Types.ObjectId;
  }): Promise<TaskLabelDocument> {
    return TaskLabelModel.create(input) as Promise<TaskLabelDocument>;
  }

  public async findById(labelId: Types.ObjectId): Promise<TaskLabelDocument | null> {
    return TaskLabelModel.findById(labelId).exec() as Promise<TaskLabelDocument | null>;
  }

  public async findByWorkspaceAndName(
    workspaceId: Types.ObjectId,
    name: string,
  ): Promise<TaskLabelDocument | null> {
    return TaskLabelModel.findOne({
      workspaceId,
      name,
    }).exec() as Promise<TaskLabelDocument | null>;
  }

  public async listByWorkspace(workspaceId: Types.ObjectId): Promise<TaskLabelDocument[]> {
    return TaskLabelModel.find({ workspaceId }).sort({ name: 1 }).exec() as Promise<
      TaskLabelDocument[]
    >;
  }

  public async update(
    labelId: Types.ObjectId,
    update: { name?: string; color?: string },
  ): Promise<TaskLabelDocument | null> {
    return TaskLabelModel.findByIdAndUpdate(labelId, update, {
      new: true,
    }).exec() as Promise<TaskLabelDocument | null>;
  }
}
