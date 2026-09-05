import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ActivityEventModel } from '../models/activity-event.model.js';
import { ActivityService } from './activity.service.js';

describe('ActivityService', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterEach(async () => {
    await Promise.all(
      Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('persists an activity event with the given fields', async () => {
    const service = new ActivityService();
    const workspaceId = new mongoose.Types.ObjectId();
    const actorId = new mongoose.Types.ObjectId();

    await service.record({
      workspaceId,
      actorId,
      event: 'task.created',
      metadata: { taskId: 'abc123' },
    });

    const stored = await ActivityEventModel.findOne({ workspaceId });
    expect(stored?.actorId.toString()).toBe(actorId.toString());
    expect(stored?.event).toBe('task.created');
    expect(stored?.metadata).toEqual({ taskId: 'abc123' });
    expect(stored?.createdAt).toBeInstanceOf(Date);
  });

  it('defaults metadata to an empty object when omitted', async () => {
    const service = new ActivityService();
    const workspaceId = new mongoose.Types.ObjectId();
    const actorId = new mongoose.Types.ObjectId();

    await service.record({ workspaceId, actorId, event: 'workspace.created' });

    const stored = await ActivityEventModel.findOne({ workspaceId });
    expect(stored?.metadata).toEqual({});
  });
});
