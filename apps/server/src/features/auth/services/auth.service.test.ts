import crypto from 'node:crypto';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../../app.js';
import { env } from '../../../config/env.js';
import type { EmailSender } from '../../../services/email.service.js';
import { UserModel } from '../../users/models/user.model.js';
import { AuthService } from './auth.service.js';

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

class UnconfiguredEmailService implements EmailSender {
  public async sendWorkspaceInvitation(): Promise<void> {
    await Promise.resolve();
  }

  public async sendEmailVerification(): Promise<void> {
    await Promise.resolve();
  }

  public async sendPasswordReset(): Promise<void> {
    await Promise.resolve();
  }

  public isConfigured(): boolean {
    return false;
  }
}

describe('Authentication flows', () => {
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

  it('validates password strength during signup', async () => {
    await request(createApp())
      .post('/api/auth/signup')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'password' })
      .expect(400);
  });

  it('signs up, logs in, refreshes, and hides password hashes', async () => {
    const app = createApp();
    const signup = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'Password1' })
      .expect(201);

    expect(signup.body.data.user.email).toBe('ada@example.com');
    expect(signup.body.data.user.password).toBeUndefined();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'Password1' })
      .expect(200);

    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: login.body.data.refreshToken })
      .expect(200);
  });

  it('handles forgot password and reset password with a valid token', async () => {
    const app = createApp();
    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'Password1' })
      .expect(201);

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'ada@example.com' })
      .expect(200);

    const user = await UserModel.findOne({ email: 'ada@example.com' }).select(
      '+passwordResetToken +passwordResetExpiresAt',
    );
    if (!user) throw new Error('Expected user');
    expect(user?.passwordResetToken).toBeTruthy();
    const resetToken = 'reset-token-with-production-length-123';
    user.passwordResetToken = hashToken(resetToken);
    user.passwordResetExpiresAt = new Date(Date.now() + 60_000);
    await user.save();

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: 'NewPassword1' })
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'NewPassword1' })
      .expect(200);
  });

  it('reports missing email configuration for password reset in development', async () => {
    const previousNodeEnv = env.NODE_ENV;
    env.NODE_ENV = 'development';
    try {
      await UserModel.create({
        name: 'Ada',
        email: 'ada@example.com',
        password: 'Password1',
      });
      const service = new AuthService(undefined, undefined, new UnconfiguredEmailService());

      await expect(service.forgotPassword({ email: 'ada@example.com' })).rejects.toThrow(
        'Email service is not configured',
      );
    } finally {
      env.NODE_ENV = previousNodeEnv;
    }
  });

  it('verifies email with a valid token', async () => {
    const app = createApp();
    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'Password1' })
      .expect(201);
    const user = await UserModel.findOne({ email: 'ada@example.com' }).select(
      '+emailVerificationToken +emailVerificationExpiresAt',
    );
    if (!user) throw new Error('Expected user');
    const verifyToken = 'verify-token-with-production-length-123';
    user.emailVerificationToken = hashToken(verifyToken);
    user.emailVerificationExpiresAt = new Date(Date.now() + 60_000);
    await user.save();

    const verified = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: verifyToken })
      .expect(200);

    expect(verified.body.data.user.isVerified).toBe(true);
  });
});
