import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { BackgroundJobModel } from '../models/background-job.model.js';
import { BackgroundJobService } from './background-job.service.js';

describe('BackgroundJobService', () => {
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

  it('marks a known job type as succeeded once processed', async () => {
    const service = new BackgroundJobService();
    await service.enqueue({
      type: 'document.cleanup.exports',
      payload: { expiredExports: 3 },
      maxAttempts: 3,
    });

    await service.processDue();

    const job = await BackgroundJobModel.findOne({ type: 'document.cleanup.exports' }).exec();
    expect(job?.status).toBe('succeeded');
    expect(job?.finishedAt).toBeTruthy();
  });

  it('fails loudly instead of silently succeeding for an unknown job type', async () => {
    const service = new BackgroundJobService();
    await service.enqueue({
      type: 'unregistered.job.type',
      payload: {},
      maxAttempts: 1,
    });

    await service.processDue();

    const job = await BackgroundJobModel.findOne({ type: 'unregistered.job.type' }).exec();
    expect(job?.status).toBe('failed');
    expect(job?.error).toContain('No handler registered');
  });

  it('retries an unknown job type until maxAttempts is exhausted', async () => {
    const service = new BackgroundJobService();
    await service.enqueue({
      type: 'unregistered.job.type',
      payload: {},
      maxAttempts: 2,
    });

    await service.processDue();
    let job = await BackgroundJobModel.findOne({ type: 'unregistered.job.type' }).exec();
    expect(job?.status).toBe('queued');

    await BackgroundJobModel.updateOne({ _id: job?._id }, { runAt: new Date() }).exec();
    await service.processDue();
    job = await BackgroundJobModel.findOne({ type: 'unregistered.job.type' }).exec();
    expect(job?.status).toBe('failed');
  });
});
