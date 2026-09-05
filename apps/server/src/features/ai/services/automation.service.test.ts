import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { EmailSender } from '../../../services/email.service.js';
import { TaskModel } from '../../tasks/models/task.model.js';
import { AutomationExecutionModel } from '../models/automation-execution.model.js';
import { AutomationRuleModel } from '../models/automation-rule.model.js';
import { AutomationService } from './automation.service.js';

class RecordingWebhookService {
  public emitted: { workspaceId: string; event: string; payload: Record<string, unknown> }[] = [];

  public async emit(input: {
    workspaceId: Types.ObjectId;
    event: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    this.emitted.push({
      workspaceId: input.workspaceId.toString(),
      event: input.event,
      payload: input.payload,
    });
  }
}

class RecordingEmailService implements EmailSender {
  public sent: { to: string; title: string; message: string }[] = [];

  public async sendWorkspaceInvitation(): Promise<void> {
    await Promise.resolve();
  }

  public async sendEmailVerification(): Promise<void> {
    await Promise.resolve();
  }

  public async sendPasswordReset(): Promise<void> {
    await Promise.resolve();
  }

  public async sendNotification(input: {
    to: string;
    title: string;
    message: string;
  }): Promise<void> {
    this.sent.push({ to: input.to, title: input.title, message: input.message });
  }

  public isConfigured(): boolean {
    return true;
  }
}

describe('AutomationService', () => {
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

  it('emits a webhook to registered endpoints when a webhook action runs', async () => {
    const workspaceId = new Types.ObjectId();
    const actorId = new Types.ObjectId();
    const webhooks = new RecordingWebhookService();
    const email = new RecordingEmailService();
    const service = new AutomationService(
      undefined,
      undefined,
      undefined,
      undefined,
      webhooks,
      email,
    );

    await AutomationRuleModel.create({
      workspaceId,
      name: 'Notify on completion',
      enabled: true,
      trigger: 'task_completed',
      conditions: [],
      actions: [{ type: 'webhook', params: { event: 'task.done' } }],
      createdBy: actorId,
    });

    const executions = await service.runForEvent({
      workspaceId,
      actorId,
      trigger: 'task_completed',
      fields: {},
    });

    expect(executions).toHaveLength(1);
    expect(executions[0]?.status).toBe('success');
    expect(webhooks.emitted).toHaveLength(1);
    expect(webhooks.emitted[0]?.event).toBe('task.done');
    expect(webhooks.emitted[0]?.workspaceId).toBe(workspaceId.toString());
  });

  it('sends an email when an email action runs with a "to" address', async () => {
    const workspaceId = new Types.ObjectId();
    const actorId = new Types.ObjectId();
    const webhooks = new RecordingWebhookService();
    const email = new RecordingEmailService();
    const service = new AutomationService(
      undefined,
      undefined,
      undefined,
      undefined,
      webhooks,
      email,
    );

    await AutomationRuleModel.create({
      workspaceId,
      name: 'Email on completion',
      enabled: true,
      trigger: 'task_completed',
      conditions: [],
      actions: [{ type: 'email', params: { to: 'ops@example.com', subject: 'Task done' } }],
      createdBy: actorId,
    });

    const executions = await service.runForEvent({
      workspaceId,
      actorId,
      trigger: 'task_completed',
      fields: {},
    });

    expect(executions[0]?.status).toBe('success');
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]?.to).toBe('ops@example.com');
    expect(email.sent[0]?.title).toBe('Task done');
  });

  it('records a failed execution when an email action has no "to" address', async () => {
    const workspaceId = new Types.ObjectId();
    const actorId = new Types.ObjectId();
    const webhooks = new RecordingWebhookService();
    const email = new RecordingEmailService();
    const service = new AutomationService(
      undefined,
      undefined,
      undefined,
      undefined,
      webhooks,
      email,
    );

    await AutomationRuleModel.create({
      workspaceId,
      name: 'Broken email rule',
      enabled: true,
      trigger: 'task_completed',
      conditions: [],
      actions: [{ type: 'email', params: {} }],
      createdBy: actorId,
    });

    const executions = await service.runForEvent({
      workspaceId,
      actorId,
      trigger: 'task_completed',
      fields: {},
    });

    expect(executions[0]?.status).toBe('failed');
    expect(email.sent).toHaveLength(0);
  });

  it('fires due_date_reached exactly once per overdue task on repeated sweeps', async () => {
    const workspaceId = new Types.ObjectId();
    const reporterId = new Types.ObjectId();
    const webhooks = new RecordingWebhookService();
    const email = new RecordingEmailService();
    const service = new AutomationService(
      undefined,
      undefined,
      undefined,
      undefined,
      webhooks,
      email,
    );

    await AutomationRuleModel.create({
      workspaceId,
      name: 'Notify overdue task',
      enabled: true,
      trigger: 'due_date_reached',
      conditions: [],
      actions: [{ type: 'webhook', params: { event: 'task.overdue' } }],
      createdBy: reporterId,
    });

    await TaskModel.create({
      workspaceId,
      projectId: new Types.ObjectId(),
      boardId: new Types.ObjectId(),
      columnId: new Types.ObjectId(),
      title: 'Ship the release',
      order: 0,
      reporterId,
      createdBy: reporterId,
      dueDate: new Date(Date.now() - 60_000),
    });

    const firstSweep = await service.sweepDueDates();
    const secondSweep = await service.sweepDueDates();

    expect(firstSweep).toBe(1);
    expect(secondSweep).toBe(0);
    expect(webhooks.emitted).toHaveLength(1);
    expect(webhooks.emitted[0]?.event).toBe('task.overdue');
    const executions = await AutomationExecutionModel.find({ workspaceId }).exec();
    expect(executions).toHaveLength(1);
  });
});
