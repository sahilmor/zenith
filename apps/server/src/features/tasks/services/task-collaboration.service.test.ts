import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../../app.js';
import type { StorageService, UploadResult } from '../../../services/cloudinary.service.js';
import { TokenService } from '../../auth/services/token.service.js';
import { BoardService } from '../../boards/services/board.service.js';
import { ColumnModel } from '../../boards/models/column.model.js';
import { ProjectService } from '../../projects/services/project.service.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { WorkspaceMemberModel } from '../../workspaces/models/workspace-member.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';
import { TaskService } from './task.service.js';
import { TaskCollaborationService } from './task-collaboration.service.js';
import { parseMentionedUserIds } from '../utils/mentions.js';
import { AttachmentModel } from '../models/attachment.model.js';
import { CommentModel } from '../models/comment.model.js';
import { TaskActivityModel } from '../models/task-activity.model.js';
import { TaskWatcherModel } from '../models/task-watcher.model.js';
import {
  resetTaskCollaborationService,
  setTaskCollaborationService,
} from '../controllers/task-collaboration.controller.js';

const tokens = new TokenService();

class FakeStorageService implements StorageService {
  public deletedPublicIds: string[] = [];

  public async uploadBuffer(): Promise<UploadResult> {
    return { publicId: 'task/file', secureUrl: 'https://cdn.example.com/task/file.pdf' };
  }

  public async deleteAsset(publicId: string): Promise<void> {
    this.deletedPublicIds.push(publicId);
  }
}

const createUser = async (email: string, name = 'Test User'): Promise<UserDocument> =>
  UserModel.create({ name, email, password: 'secure-password' }) as Promise<UserDocument>;

const bearer = (user: UserDocument): string =>
  `Bearer ${tokens.generateAccessToken({ userId: user.id, email: user.email, role: 'user' })}`;

const createTaskFixture = async (user: UserDocument) => {
  const workspaceService = new WorkspaceService();
  const projectService = new ProjectService();
  const boardService = new BoardService();
  const taskService = new TaskService();
  const workspace = await workspaceService.createWorkspace(user._id, {
    name: 'Acme',
    visibility: 'private',
  });
  const project = await projectService.createProject(
    new mongoose.Types.ObjectId(workspace.id),
    user._id,
    { name: 'Web', key: 'WEB', visibility: 'private' },
  );
  const board = await boardService.createBoard(new mongoose.Types.ObjectId(project.id), user._id, {
    name: 'Delivery',
    isDefault: true,
  });
  const column = await ColumnModel.findOne({ boardId: board.id }).sort({ order: 1 });
  if (!column) throw new Error('Expected default column');
  const task = await taskService.createTask(column._id, user._id, {
    title: 'Collaborate',
    priority: 'medium',
    status: 'open',
    assigneeIds: [],
    labels: [],
  });
  return { workspace, project, board, column, task };
};

describe('Task collaboration module', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterEach(async () => {
    resetTaskCollaborationService();
    await Promise.all(
      Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('parses supported mention formats without duplicates', () => {
    const userId = new mongoose.Types.ObjectId().toString();
    expect(parseMentionedUserIds(`Hello @[Ada](user:${userId}) and @${userId}`)).toEqual([userId]);
  });

  it('creates, edits, deletes, and replies to comments with activity', async () => {
    const user = await createUser('owner@example.com');
    const mentioned = await createUser('mentioned@example.com');
    const { task } = await createTaskFixture(user);
    const service = new TaskCollaborationService();

    const comment = await service.createComment(new mongoose.Types.ObjectId(task.id), user._id, {
      content: `Please check @[Mentioned](user:${mentioned.id})`,
    });
    const reply = await service.createReply(new mongoose.Types.ObjectId(comment.id), user._id, {
      content: 'Reply',
    });
    const edited = await service.updateComment(new mongoose.Types.ObjectId(comment.id), user._id, {
      content: 'Updated',
    });
    await service.deleteComment(new mongoose.Types.ObjectId(reply.id), user._id);

    expect(comment.mentionedUserIds).toEqual([mentioned.id]);
    expect(reply.parentCommentId).toBe(comment.id);
    expect(edited.editedAt).toBeTruthy();
    expect(await CommentModel.findById(reply.id)).toBeNull();
    expect(await TaskActivityModel.findOne({ action: 'comment.added' })).toBeTruthy();
  });

  it('uploads, validates, lists, and deletes attachments through storage', async () => {
    const user = await createUser('owner@example.com');
    const { task } = await createTaskFixture(user);
    const storage = new FakeStorageService();
    const service = new TaskCollaborationService(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      storage,
    );
    const file = {
      originalname: 'spec.pdf',
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('pdf'),
    } as Express.Multer.File;

    const attachment = await service.uploadAttachment(
      new mongoose.Types.ObjectId(task.id),
      user._id,
      file,
    );
    const listed = await service.listAttachments(new mongoose.Types.ObjectId(task.id), user._id);
    await service.deleteAttachment(new mongoose.Types.ObjectId(attachment.id), user._id);

    expect(listed).toHaveLength(1);
    expect(storage.deletedPublicIds).toEqual(['task/file']);
    expect(await AttachmentModel.findById(attachment.id)).toBeNull();
  });

  it('uploads, lists, and deletes attachments through the API', async () => {
    const user = await createUser('owner@example.com');
    const { task } = await createTaskFixture(user);
    const storage = new FakeStorageService();
    setTaskCollaborationService(
      new TaskCollaborationService(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        storage,
      ),
    );
    const app = createApp();

    const upload = await request(app)
      .post(`/api/tasks/${task.id}/attachments`)
      .set('Authorization', bearer(user))
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'spec.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(upload.body.data.originalName).toBe('spec.pdf');
    expect(upload.body.data.url).toBe('https://cdn.example.com/task/file.pdf');

    const listed = await request(app)
      .get(`/api/tasks/${task.id}/attachments`)
      .set('Authorization', bearer(user))
      .expect(200);

    expect(listed.body.data).toHaveLength(1);

    await request(app)
      .delete(`/api/attachments/${upload.body.data.id}`)
      .set('Authorization', bearer(user))
      .expect(200);

    expect(storage.deletedPublicIds).toEqual(['task/file']);
    expect(await AttachmentModel.findById(upload.body.data.id)).toBeNull();
  });

  it('accepts valid attachment extensions when multipart MIME is generic', async () => {
    const user = await createUser('owner@example.com');
    const { task } = await createTaskFixture(user);
    setTaskCollaborationService(
      new TaskCollaborationService(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        new FakeStorageService(),
      ),
    );
    const app = createApp();

    await request(app)
      .post(`/api/tasks/${task.id}/attachments`)
      .set('Authorization', bearer(user))
      .attach('file', Buffer.from('PK'), {
        filename: 'archive.zip',
        contentType: 'application/octet-stream',
      })
      .expect(201);
  });

  it('rejects unsupported attachment types before upload', async () => {
    const user = await createUser('owner@example.com');
    const { task } = await createTaskFixture(user);
    const service = new TaskCollaborationService(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      new FakeStorageService(),
    );

    await expect(
      service.uploadAttachment(new mongoose.Types.ObjectId(task.id), user._id, {
        originalname: 'script.sh',
        mimetype: 'text/x-shellscript',
        size: 100,
        buffer: Buffer.from('bad'),
      } as Express.Multer.File),
    ).rejects.toThrow('Unsupported attachment type');
  });

  it('assigns/removes labels and watches tasks', async () => {
    const user = await createUser('owner@example.com');
    const { task } = await createTaskFixture(user);
    const service = new TaskCollaborationService();

    const label = await service.createAndAssignLabel(
      new mongoose.Types.ObjectId(task.id),
      user._id,
      {
        name: 'Frontend',
        color: '#22c55e',
      },
    );
    const labels = await service.listLabels(new mongoose.Types.ObjectId(task.id), user._id);
    const watcher = await service.watchTask(new mongoose.Types.ObjectId(task.id), user._id);
    await service.unwatchTask(new mongoose.Types.ObjectId(task.id), user._id);
    await service.removeLabel(
      new mongoose.Types.ObjectId(task.id),
      new mongoose.Types.ObjectId(label.id),
      user._id,
    );

    expect(labels).toHaveLength(1);
    expect(watcher.userId).toBe(user.id);
    expect(await TaskWatcherModel.findById(watcher.id)).toBeNull();
  });

  it('validates API input and enforces authorization for collaboration', async () => {
    const owner = await createUser('owner@example.com');
    const guest = await createUser('guest@example.com');
    const { workspace, task } = await createTaskFixture(owner);
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: guest._id,
      role: 'guest',
      status: 'active',
      joinedAt: new Date(),
    });
    const app = createApp();

    await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set('Authorization', bearer(owner))
      .send({ content: '' })
      .expect(400);

    await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set('Authorization', bearer(guest))
      .send({ content: 'Guest comment' })
      .expect(403);

    const comment = await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set('Authorization', bearer(owner))
      .send({ content: 'Owner comment' })
      .expect(201);

    await request(app)
      .post(`/api/comments/${comment.body.data.id}/replies`)
      .set('Authorization', bearer(owner))
      .send({ content: 'Reply' })
      .expect(201);

    await request(app)
      .post(`/api/tasks/${task.id}/watch`)
      .set('Authorization', bearer(owner))
      .expect(200);

    await request(app)
      .post(`/api/tasks/${task.id}/labels`)
      .set('Authorization', bearer(owner))
      .send({ name: 'Bug', color: '#ef4444' })
      .expect(201);

    await request(app)
      .get(`/api/tasks/${task.id}/activity`)
      .set('Authorization', bearer(owner))
      .expect(200);
  });
});
