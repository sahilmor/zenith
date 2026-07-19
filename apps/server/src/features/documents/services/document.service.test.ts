import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';
import { TokenService } from '../../auth/services/token.service.js';
import { subscriptionService } from '../../billing/services/subscription.service.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { WorkspaceMemberModel } from '../../workspaces/models/workspace-member.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';
import { DocumentOperationalMetricModel } from '../models/document-operations.model.js';

const tokens = new TokenService();

const createUser = (email: string): Promise<UserDocument> =>
  UserModel.create({
    name: 'Docs User',
    email,
    password: 'secure-password',
  }) as Promise<UserDocument>;

const bearer = (user: UserDocument): string =>
  `Bearer ${tokens.generateAccessToken({ userId: user.id, email: user.email, role: user.role })}`;

describe('Document platform module', () => {
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

  it('creates spaces, pages, blocks, versions, comments, and enforces page permissions', async () => {
    const app = createApp();
    const owner = await createUser('docs-owner@example.com');
    const guest = await createUser('docs-guest@example.com');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Docs Workspace',
      visibility: 'private',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: guest._id,
      role: 'member',
      status: 'active',
      joinedAt: new Date(),
    });
    await subscriptionService.syncSubscription({
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      provider: 'local',
      planCode: 'business',
      billingInterval: 'monthly',
      currency: 'usd',
      status: 'active',
    });

    const space = await request(app)
      .post(`/api/workspaces/${workspace.id}/spaces`)
      .set('Authorization', bearer(owner))
      .send({ name: 'Engineering', description: 'Product engineering knowledge' })
      .expect(201);

    const page = await request(app)
      .post(`/api/spaces/${space.body.data.id}/pages`)
      .set('Authorization', bearer(owner))
      .send({
        title: 'Authentication Guide',
        blocks: [
          {
            stableId: 'intro',
            type: 'paragraph',
            order: 0,
            content: { text: 'JWT and refresh token architecture.' },
          },
        ],
        permissions: [{ userId: guest.id, role: 'commenter' }],
      })
      .expect(201);

    expect(page.body.data.blocks).toHaveLength(1);
    expect(page.body.data.breadcrumbs.map((crumb: { title: string }) => crumb.title)).toContain(
      'Engineering',
    );

    await request(app)
      .put(`/api/pages/${page.body.data.id}/blocks`)
      .set('Authorization', bearer(guest))
      .send({
        blocks: [
          {
            stableId: 'guest-edit',
            type: 'paragraph',
            order: 0,
            content: { text: 'Guests cannot edit.' },
          },
        ],
      })
      .expect(403);

    const blocks = await request(app)
      .put(`/api/pages/${page.body.data.id}/blocks`)
      .set('Authorization', bearer(owner))
      .send({
        blocks: [
          {
            stableId: 'intro',
            type: 'paragraph',
            order: 0,
            content: { text: 'Updated architecture.' },
          },
          {
            stableId: 'checklist',
            type: 'checklist',
            order: 1,
            content: { text: 'Rotate refresh tokens', checked: false },
          },
        ],
      })
      .expect(200);

    expect(blocks.body.data).toHaveLength(2);

    await request(app)
      .put(`/api/pages/${page.body.data.id}/blocks`)
      .set('Authorization', bearer(owner))
      .send({
        blocks: [
          {
            stableId: 'unsafe',
            type: 'paragraph',
            order: 0,
            content: { text: '<script>alert("xss")</script>' },
          },
        ],
      })
      .expect(400);

    const version = await request(app)
      .post(`/api/pages/${page.body.data.id}/publish`)
      .set('Authorization', bearer(owner))
      .send({ summary: 'Initial published guide' })
      .expect(200);

    expect(version.body.data.version).toBe(1);
    expect(version.body.data.blockSnapshot).toHaveLength(2);

    const comment = await request(app)
      .post(`/api/pages/${page.body.data.id}/comments`)
      .set('Authorization', bearer(guest))
      .send({ content: 'Looks good for support handoff.' })
      .expect(201);

    expect(comment.body.data.pageId).toBe(page.body.data.id);

    const comments = await request(app)
      .get(`/api/pages/${page.body.data.id}/comments`)
      .set('Authorization', bearer(owner))
      .expect(200);

    expect(comments.body.data).toHaveLength(1);
  });

  it('supports knowledge home, favorites, pins, templates, watchers, outlines, and backlinks', async () => {
    const app = createApp();
    const owner = await createUser('knowledge-owner@example.com');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Knowledge Workspace',
      visibility: 'private',
    });
    await subscriptionService.syncSubscription({
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      provider: 'local',
      planCode: 'business',
      billingInterval: 'monthly',
      currency: 'usd',
      status: 'active',
    });

    const space = await request(app)
      .post(`/api/workspaces/${workspace.id}/spaces`)
      .set('Authorization', bearer(owner))
      .send({
        name: 'Engineering',
        banner: 'https://res.cloudinary.com/demo/image/upload/docs.jpg',
        defaultPermissions: [],
      })
      .expect(201);

    const targetPage = await request(app)
      .post(`/api/spaces/${space.body.data.id}/pages`)
      .set('Authorization', bearer(owner))
      .send({
        title: 'API Design',
        blocks: [
          {
            stableId: 'api-heading',
            type: 'heading_1',
            order: 0,
            content: { text: 'API Design' },
          },
        ],
      })
      .expect(201);

    const sourcePage = await request(app)
      .post(`/api/spaces/${space.body.data.id}/pages`)
      .set('Authorization', bearer(owner))
      .send({
        title: 'Architecture Overview',
        blocks: [
          {
            stableId: 'arch-heading',
            type: 'heading_2',
            order: 0,
            content: { text: 'Architecture' },
          },
          {
            stableId: 'arch-link',
            type: 'paragraph',
            order: 1,
            content: { text: 'See API design.', pageId: targetPage.body.data.id },
          },
        ],
      })
      .expect(201);

    await request(app)
      .post('/api/document-favorites')
      .set('Authorization', bearer(owner))
      .send({
        workspaceId: workspace.id,
        targetType: 'page',
        targetId: sourcePage.body.data.id,
      })
      .expect(201);

    await request(app)
      .post(`/api/pages/${sourcePage.body.data.id}/pins`)
      .set('Authorization', bearer(owner))
      .send({ scope: 'workspace' })
      .expect(201);

    const watcher = await request(app)
      .post(`/api/pages/${sourcePage.body.data.id}/watch`)
      .set('Authorization', bearer(owner))
      .send({ subscription: 'major_updates' })
      .expect(201);

    expect(watcher.body.data.subscription).toBe('major_updates');

    const template = await request(app)
      .post(`/api/workspaces/${workspace.id}/document-templates`)
      .set('Authorization', bearer(owner))
      .send({
        spaceId: space.body.data.id,
        name: 'Runbook',
        category: 'Engineering',
        blocks: [
          {
            stableId: 'template-intro',
            type: 'paragraph',
            order: 0,
            content: { text: 'Runbook for {{workspaceName}} on {{currentDate}}' },
          },
        ],
        variables: ['workspaceName', 'currentDate'],
      })
      .expect(201);

    const templatedPage = await request(app)
      .post(`/api/document-templates/${template.body.data.id}/use`)
      .set('Authorization', bearer(owner))
      .send({
        spaceId: space.body.data.id,
        title: 'Incident Runbook',
        variables: {},
      })
      .expect(201);

    expect(templatedPage.body.data.blocks[0].content.text).toContain('Knowledge Workspace');

    const sourceDetail = await request(app)
      .get(`/api/pages/${sourcePage.body.data.id}`)
      .set('Authorization', bearer(owner))
      .expect(200);

    expect(sourceDetail.body.data.outline[0].title).toBe('Architecture');
    expect(sourceDetail.body.data.watcher.subscription).toBe('major_updates');
    expect(sourceDetail.body.data.forwardLinks).toHaveLength(1);

    const backlinks = await request(app)
      .get(`/api/pages/${targetPage.body.data.id}/backlinks`)
      .set('Authorization', bearer(owner))
      .expect(200);

    expect(backlinks.body.data[0].sourcePageId).toBe(sourcePage.body.data.id);

    const home = await request(app)
      .get(`/api/workspaces/${workspace.id}/knowledge-home`)
      .set('Authorization', bearer(owner))
      .expect(200);

    expect(home.body.data.favorites).toHaveLength(1);
    expect(home.body.data.pinnedPages).toHaveLength(1);
    expect(home.body.data.recentPages.length).toBeGreaterThan(0);
    expect(home.body.data.templates[0].name).toBe('Runbook');
  });

  it('supports document operations, import/export, bulk actions, media, and retention policy', async () => {
    const app = createApp();
    const owner = await createUser('document-ops-owner@example.com');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Document Ops Workspace',
      visibility: 'private',
    });
    await subscriptionService.syncSubscription({
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      provider: 'local',
      planCode: 'business',
      billingInterval: 'monthly',
      currency: 'usd',
      status: 'active',
    });

    const space = await request(app)
      .post(`/api/workspaces/${workspace.id}/spaces`)
      .set('Authorization', bearer(owner))
      .send({ name: 'Operations' })
      .expect(201);

    const imported = await request(app)
      .post(`/api/workspaces/${workspace.id}/documents/import`)
      .set('Authorization', bearer(owner))
      .send({
        spaceId: space.body.data.id,
        title: 'Imported Runbook',
        format: 'markdown',
        content: '# Restore\n\n- Check queues\n\n> Escalate when blocked',
      })
      .expect(201);

    expect(imported.body.data.blockCount).toBeGreaterThan(1);
    expect(imported.body.data.page.blocks[0].type).toBe('heading_1');
    await request(app)
      .post(`/api/workspaces/${workspace.id}/documents/import`)
      .set('Authorization', bearer(owner))
      .send({
        spaceId: space.body.data.id,
        title: 'Unsupported PDF',
        format: 'pdf',
        content: 'not a pdf parser',
      })
      .expect(400);

    const exported = await request(app)
      .get(`/api/documents/export?pageId=${imported.body.data.page.id}&format=markdown`)
      .set('Authorization', bearer(owner))
      .expect(200);

    expect(exported.text).toContain('# Imported Runbook');
    expect(exported.headers['content-disposition']).toContain('.md');

    const synced = await request(app)
      .post(`/api/workspaces/${workspace.id}/documents/sync`)
      .set('Authorization', bearer(owner))
      .send({
        operations: [
          {
            clientOperationId: 'offline-save-1',
            pageId: imported.body.data.page.id,
            type: 'save_blocks',
            baseUpdatedAt: imported.body.data.page.updatedAt,
            payload: {
              blocks: [
                {
                  type: 'paragraph',
                  order: 0,
                  content: { text: 'Offline update applied.' },
                },
              ],
            },
          },
        ],
      })
      .expect(200);

    expect(synced.body.data.applied).toHaveLength(1);

    const conflicted = await request(app)
      .post(`/api/workspaces/${workspace.id}/documents/sync`)
      .set('Authorization', bearer(owner))
      .send({
        operations: [
          {
            clientOperationId: 'offline-save-2',
            pageId: imported.body.data.page.id,
            type: 'save_blocks',
            baseUpdatedAt: imported.body.data.page.updatedAt,
            payload: {
              blocks: [
                {
                  type: 'paragraph',
                  order: 0,
                  content: { text: 'Stale offline update.' },
                },
              ],
            },
          },
        ],
      })
      .expect(200);

    expect(conflicted.body.data.status).toBe('conflict');
    expect(conflicted.body.data.conflicts).toHaveLength(1);

    const bulk = await request(app)
      .post(`/api/workspaces/${workspace.id}/documents/bulk`)
      .set('Authorization', bearer(owner))
      .send({ action: 'duplicate', pageIds: [imported.body.data.page.id] })
      .expect(200);

    expect(bulk.body.data.succeeded).toBe(1);

    const media = await request(app)
      .post(`/api/workspaces/${workspace.id}/media`)
      .set('Authorization', bearer(owner))
      .field('pageId', imported.body.data.page.id)
      .attach('file', Buffer.from('fake image'), {
        filename: 'runbook.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(media.body.data.usageCount).toBe(1);

    await request(app)
      .delete(`/api/media/${media.body.data.id}`)
      .set('Authorization', bearer(owner))
      .expect(409);

    const policy = await request(app)
      .patch(`/api/workspaces/${workspace.id}/document-retention-policy`)
      .set('Authorization', bearer(owner))
      .send({ deletedRetentionDays: 120, temporaryExportRetentionHours: 12 })
      .expect(200);

    expect(policy.body.data.deletedRetentionDays).toBe(120);

    const listedMedia = await request(app)
      .get(`/api/workspaces/${workspace.id}/media`)
      .set('Authorization', bearer(owner))
      .expect(200);

    expect(listedMedia.body.data.items).toHaveLength(1);

    await request(app)
      .post('/api/documents/cleanup')
      .set('Authorization', bearer(owner))
      .expect(403);

    const metrics = await DocumentOperationalMetricModel.find({
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
    }).exec();

    expect(metrics.map((metric) => metric.operation)).toContain('import');
    expect(metrics.map((metric) => metric.operation)).toContain('export');
    expect(metrics.map((metric) => metric.operation)).toContain('sync');
  });
});
