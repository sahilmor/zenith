import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { UserModel, type UserDocument } from './user.model.js';

describe('UserModel', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    // autoIndex is disabled globally for tests (see src/test/setup-env.ts), so the
    // schema's unique email index must be built explicitly to test it here.
    await UserModel.syncIndexes();
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

  it('hashes the password on save and verifies it via comparePassword', async () => {
    const user = (await UserModel.create({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'super-secret-1',
    })) as UserDocument;

    expect(user.password).not.toBe('super-secret-1');
    await expect(user.comparePassword('super-secret-1')).resolves.toBe(true);
    await expect(user.comparePassword('wrong-password')).resolves.toBe(false);
  });

  it('does not rehash the password when other fields are updated', async () => {
    const user = await UserModel.create({
      name: 'Ada Lovelace',
      email: 'ada-rehash@example.com',
      password: 'super-secret-1',
    });
    const originalHash = user.password;

    user.name = 'Ada L.';
    await user.save();

    expect(user.password).toBe(originalHash);
  });

  it('lowercases and trims the email', async () => {
    const user = await UserModel.create({
      name: 'Grace Hopper',
      email: '  Grace@Example.com  ',
      password: 'super-secret-1',
    });

    expect(user.email).toBe('grace@example.com');
  });

  it('rejects a duplicate email', async () => {
    await UserModel.create({
      name: 'First User',
      email: 'duplicate@example.com',
      password: 'super-secret-1',
    });

    await expect(
      UserModel.create({
        name: 'Second User',
        email: 'duplicate@example.com',
        password: 'another-secret',
      }),
    ).rejects.toThrow();
  });

  it('requires name, email, and password', async () => {
    await expect(
      UserModel.create({ email: 'missing-name@example.com', password: 'super-secret-1' }),
    ).rejects.toThrow();
    await expect(
      UserModel.create({ name: 'No Email', password: 'super-secret-1' }),
    ).rejects.toThrow();
    await expect(
      UserModel.create({ name: 'No Password', email: 'no-password@example.com' }),
    ).rejects.toThrow();
  });

  it('defaults role to user and does not select sensitive fields by default', async () => {
    const created = await UserModel.create({
      name: 'Default Role',
      email: 'default-role@example.com',
      password: 'super-secret-1',
    });
    expect(created.role).toBe('user');

    const fetched = await UserModel.findById(created._id);
    expect(fetched?.password).toBeUndefined();
  });
});
