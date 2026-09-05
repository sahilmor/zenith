import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';
import type { EmailSender } from '../../../services/email.service.js';
import { TokenService } from '../../auth/services/token.service.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { NotificationPreferenceRepository } from '../repositories/notification.repository.js';
import { NotificationService } from './notification.service.js';
import { notificationService } from './notification.service.js';

const tokens = new TokenService();

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

const createUser = async (email: string, name = 'Notify User'): Promise<UserDocument> =>
  UserModel.create({ name, email, password: 'secure-password' }) as Promise<UserDocument>;

const bearer = (user: UserDocument): string =>
  `Bearer ${tokens.generateAccessToken({ userId: user.id, email: user.email, role: 'user' })}`;

describe('Notification module', () => {
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

  it('creates, lists, reads, and deletes notifications for the owner only', async () => {
    const recipient = await createUser('recipient@example.com');
    const actor = await createUser('actor@example.com');
    const outsider = await createUser('outsider@example.com');
    const notification = await notificationService.create({
      userId: recipient._id,
      actorId: actor._id,
      type: 'task_assigned',
      title: 'Assigned',
      message: 'You were assigned',
    });
    if (!notification) throw new Error('Expected notification');
    const app = createApp();

    const listed = await request(app)
      .get('/api/notifications?limit=10')
      .set('Authorization', bearer(recipient))
      .expect(200);
    expect(listed.body.data.items).toHaveLength(1);

    await request(app)
      .patch(`/api/notifications/${notification.id}/read`)
      .set('Authorization', bearer(outsider))
      .expect(404);

    await request(app)
      .patch(`/api/notifications/${notification.id}/read`)
      .set('Authorization', bearer(recipient))
      .expect(200);
    expect(await NotificationModel.countDocuments({ userId: recipient._id, isRead: false })).toBe(
      0,
    );

    await request(app)
      .delete(`/api/notifications/${notification.id}`)
      .set('Authorization', bearer(recipient))
      .expect(200);
    expect(await NotificationModel.findById(notification.id)).toBeNull();
  });

  it('supports unread count, filtering, pagination, read all, clear all, and preferences', async () => {
    const recipient = await createUser('recipient@example.com');
    const actor = await createUser('actor@example.com');
    await Promise.all(
      ['task_assigned', 'comment_reply', 'project_created'].map((type, index) =>
        notificationService.create({
          userId: recipient._id,
          actorId: actor._id,
          type: type as 'task_assigned' | 'comment_reply' | 'project_created',
          title: `Notification ${index}`,
          message: `Message ${index}`,
        }),
      ),
    );
    const app = createApp();

    const unread = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', bearer(recipient))
      .expect(200);
    expect(unread.body.data.count).toBe(3);

    const filtered = await request(app)
      .get('/api/notifications?type=comment_reply&page=1&limit=1&search=Message')
      .set('Authorization', bearer(recipient))
      .expect(200);
    expect(filtered.body.data.items).toHaveLength(1);
    expect(filtered.body.data.total).toBe(1);

    await request(app)
      .patch('/api/notifications/preferences')
      .set('Authorization', bearer(recipient))
      .send({ comments: false })
      .expect(200);
    await notificationService.create({
      userId: recipient._id,
      actorId: actor._id,
      type: 'comment_reply',
      title: 'Muted',
      message: 'Muted',
    });
    expect(await NotificationModel.countDocuments({ userId: recipient._id })).toBe(3);

    await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', bearer(recipient))
      .expect(200);
    expect(await NotificationModel.countDocuments({ userId: recipient._id, isRead: false })).toBe(
      0,
    );

    await request(app)
      .delete('/api/notifications')
      .set('Authorization', bearer(recipient))
      .expect(200);
    expect(await NotificationModel.countDocuments({ userId: recipient._id })).toBe(0);
  });

  it('emails the recipient when email preference is on, independent of in-app', async () => {
    const preferences = new NotificationPreferenceRepository();
    const recipient = await createUser('email-recipient@example.com');
    const actor = await createUser('email-actor@example.com');
    await preferences.update(recipient._id, { email: true, inApp: false });
    const email = new RecordingEmailService();
    const service = new NotificationService(undefined, undefined, email);

    const result = await service.create({
      userId: recipient._id,
      actorId: actor._id,
      type: 'task_assigned',
      title: 'Assigned',
      message: 'You were assigned a task',
    });

    // inApp is off, so no notification record/summary is produced...
    expect(result).toBeNull();
    expect(await NotificationModel.countDocuments({ userId: recipient._id })).toBe(0);
    // ...but the email still goes out, since email delivery is independent of the in-app toggle.
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]?.to).toBe(recipient.email);
    expect(email.sent[0]?.message).toBe('You were assigned a task');
  });

  it('does not email when the notification category is muted', async () => {
    const preferences = new NotificationPreferenceRepository();
    const recipient = await createUser('muted-recipient@example.com');
    const actor = await createUser('muted-actor@example.com');
    await preferences.update(recipient._id, { email: true, comments: false });
    const email = new RecordingEmailService();
    const service = new NotificationService(undefined, undefined, email);

    const result = await service.create({
      userId: recipient._id,
      actorId: actor._id,
      type: 'comment_reply',
      title: 'Reply',
      message: 'Someone replied',
    });

    expect(result).toBeNull();
    expect(email.sent).toHaveLength(0);
  });
});
