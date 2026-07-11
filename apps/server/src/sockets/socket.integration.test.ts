import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { TokenService } from '../features/auth/services/token.service.js';
import { ColumnModel } from '../features/boards/models/column.model.js';
import { BoardService } from '../features/boards/services/board.service.js';
import { ProjectService } from '../features/projects/services/project.service.js';
import { TaskService } from '../features/tasks/services/task.service.js';
import { UserModel, type UserDocument } from '../features/users/models/user.model.js';
import { WorkspaceService } from '../features/workspaces/services/workspace.service.js';
import { initializeSocketServer } from './index.js';
import { realtimeService } from './realtime.service.js';

const tokens = new TokenService();

const createUser = async (email: string, name = 'Socket User'): Promise<UserDocument> =>
  UserModel.create({ name, email, password: 'secure-password' }) as Promise<UserDocument>;

const accessToken = (user: UserDocument): string =>
  tokens.generateAccessToken({ userId: user.id, email: user.email, role: 'user' });

const createTaskFixture = async (owner: UserDocument) => {
  const workspace = await new WorkspaceService().createWorkspace(owner._id, {
    name: 'Realtime',
    visibility: 'private',
  });
  const project = await new ProjectService().createProject(
    new mongoose.Types.ObjectId(workspace.id),
    owner._id,
    { name: 'Realtime Project', key: 'RTP', visibility: 'private' },
  );
  const board = await new BoardService().createBoard(
    new mongoose.Types.ObjectId(project.id),
    owner._id,
    {
      name: 'Realtime Board',
      isDefault: true,
    },
  );
  const column = await ColumnModel.findOne({ boardId: board.id }).sort({ order: 1 });
  if (!column) throw new Error('Expected default column');
  const task = await new TaskService().createTask(column._id, owner._id, {
    title: 'Realtime Task',
    priority: 'medium',
    status: 'open',
    assigneeIds: [],
    labels: [],
  });
  return { workspace, task };
};

const waitForEvent = <T>(socket: ClientSocket, event: string): Promise<T> =>
  new Promise((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });

const emitWithAck = <T>(socket: ClientSocket, event: string, payload: T) =>
  new Promise<{ ok: boolean; message?: string }>((resolve) => {
    socket.emit(event, payload, resolve);
  });

describe('realtime socket server', () => {
  let mongo: MongoMemoryServer;
  let httpServer: HttpServer;
  let url: string;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      if (!httpServer?.listening) {
        resolve();
        return;
      }
      httpServer.close(() => resolve());
    });
    await Promise.all(
      Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  const startSocketServer = async () => {
    httpServer = createServer(createApp());
    initializeSocketServer(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address() as AddressInfo;
    url = `http://localhost:${address.port}`;
  };

  const connectClient = async (token: string): Promise<ClientSocket> => {
    const socket = createClient(url, {
      auth: { token },
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    });
    await waitForEvent(socket, 'connect');
    return socket;
  };

  it('rejects invalid tokens', async () => {
    await startSocketServer();
    const socket = createClient(url, {
      auth: { token: 'invalid' },
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    });

    const error = await waitForEvent<Error>(socket, 'connect_error');
    expect(error.message).toBe('Invalid or expired access token');
    socket.close();
  });

  it('joins authorized rooms and denies unauthorized rooms', async () => {
    await startSocketServer();
    const owner = await createUser('owner@example.com');
    const outsider = await createUser('outsider@example.com');
    const { workspace } = await createTaskFixture(owner);

    const ownerSocket = await connectClient(accessToken(owner));
    const outsiderSocket = await connectClient(accessToken(outsider));

    await expect(
      emitWithAck(ownerSocket, 'room:join', { scope: 'workspace', id: workspace.id }),
    ).resolves.toEqual({ ok: true });
    await expect(
      emitWithAck(outsiderSocket, 'room:join', { scope: 'workspace', id: workspace.id }),
    ).resolves.toEqual({ ok: false, message: 'Room access denied' });

    ownerSocket.close();
    outsiderSocket.close();
  });

  it('broadcasts scoped realtime events only to joined authorized users', async () => {
    await startSocketServer();
    const owner = await createUser('owner@example.com');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Realtime',
      visibility: 'private',
    });
    const first = await connectClient(accessToken(owner));
    const second = await connectClient(accessToken(owner));
    await emitWithAck(first, 'room:join', { scope: 'workspace', id: workspace.id });
    await emitWithAck(second, 'room:join', { scope: 'workspace', id: workspace.id });

    const eventPromise = waitForEvent(second, 'realtime:event');
    realtimeService.emitMutation({
      resource: 'workspace',
      action: 'updated',
      workspaceId: workspace.id,
      actorId: owner.id,
      data: { name: 'Updated' },
    });

    await expect(eventPromise).resolves.toMatchObject({
      resource: 'workspace',
      action: 'updated',
      workspaceId: workspace.id,
    });

    first.close();
    second.close();
  });

  it('publishes presence snapshots and typing indicators', async () => {
    await startSocketServer();
    const owner = await createUser('owner@example.com');
    const { workspace, task } = await createTaskFixture(owner);
    const first = await connectClient(accessToken(owner));
    const second = await connectClient(accessToken(owner));

    const presencePromise = waitForEvent(second, 'presence:snapshot');
    await emitWithAck(first, 'room:join', { scope: 'workspace', id: workspace.id });
    await emitWithAck(second, 'room:join', { scope: 'workspace', id: workspace.id });
    await expect(presencePromise).resolves.toMatchObject({
      scope: 'workspace',
      roomId: workspace.id,
    });

    await emitWithAck(first, 'room:join', { scope: 'task', id: task.id });
    await emitWithAck(second, 'room:join', { scope: 'task', id: task.id });
    const typingPromise = waitForEvent(second, 'typing:update');
    first.emit('typing:update', { taskId: task.id, typing: true });
    await expect(typingPromise).resolves.toMatchObject({
      taskId: task.id,
      userId: owner.id,
      typing: true,
    });

    first.close();
    second.close();
  });
});
