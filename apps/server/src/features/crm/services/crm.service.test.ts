import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ActivityEventModel } from '../../activity/models/activity-event.model.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { WorkspaceMemberModel } from '../../workspaces/models/workspace-member.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';
import { CrmService } from './crm.service.js';

const createUser = async (email: string, name = 'Test User'): Promise<UserDocument> =>
  UserModel.create({
    name,
    email,
    password: 'secure-password',
  }) as Promise<UserDocument>;

describe('CrmService', () => {
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

  it('creates accounts, contacts, deals, activities, and dashboard metrics', async () => {
    const owner = await createUser('owner@example.com');
    const workspaceService = new WorkspaceService();
    const crmService = new CrmService();
    const workspace = await workspaceService.createWorkspace(owner._id, {
      name: 'Acme',
      visibility: 'private',
    });
    const workspaceId = new mongoose.Types.ObjectId(workspace.id);

    const account = await crmService.createAccount(workspaceId, owner._id, {
      name: 'Acme Corp',
      domain: 'acme.example',
      status: 'customer',
      healthScore: 42,
      lifecycleStage: 'implementation',
      tags: ['strategic'],
      customFields: [],
    });
    const contact = await crmService.createContact(workspaceId, owner._id, {
      accountId: account.id,
      firstName: 'Avery',
      lastName: 'Buyer',
      email: 'avery@acme.example',
      tags: [],
      customFields: [],
    });
    const deal = await crmService.createDeal(workspaceId, owner._id, {
      accountId: account.id,
      contactId: contact.id,
      name: 'Enterprise rollout',
      stage: 'proposal',
      forecastCategory: 'commit',
      value: 50000,
      currency: 'usd',
      probability: 60,
      tags: [],
      customFields: [],
    });
    const activity = await crmService.createActivity(workspaceId, owner._id, {
      accountId: account.id,
      dealId: deal.id,
      type: 'meeting',
      title: 'Executive alignment',
    });
    const dashboard = await crmService.getDashboard(workspaceId, owner._id);

    expect(account.healthStatus).toBe('at_risk');
    expect(contact.accountId).toBe(account.id);
    expect(deal.value).toBe(50000);
    expect(activity.type).toBe('meeting');
    expect(dashboard.accountCount).toBe(1);
    expect(dashboard.contactCount).toBe(1);
    expect(dashboard.openDealCount).toBe(1);
    expect(dashboard.pipelineValue).toBe(50000);
    expect(dashboard.weightedPipelineValue).toBe(30000);
    expect(dashboard.nextActions.some((action) => action.entityType === 'account')).toBe(true);
    expect(await ActivityEventModel.countDocuments({ event: /^crm\./ })).toBeGreaterThanOrEqual(4);
  });

  it('allows members to view CRM data but restricts CRM writes to managers', async () => {
    const owner = await createUser('owner@example.com');
    const member = await createUser('member@example.com');
    const workspaceService = new WorkspaceService();
    const crmService = new CrmService();
    const workspace = await workspaceService.createWorkspace(owner._id, {
      name: 'Acme',
      visibility: 'private',
    });
    const workspaceId = new mongoose.Types.ObjectId(workspace.id);
    await WorkspaceMemberModel.create({
      workspaceId,
      userId: member._id,
      role: 'member',
      status: 'active',
      joinedAt: new Date(),
    });
    await crmService.createAccount(workspaceId, owner._id, {
      name: 'Visible Account',
      status: 'prospect',
      healthScore: 80,
      lifecycleStage: 'sales',
      tags: [],
      customFields: [],
    });

    const accounts = await crmService.listAccounts(workspaceId, member._id);
    await expect(
      crmService.createLead(workspaceId, member._id, {
        companyName: 'Blocked Lead',
        contactName: 'Blocked Buyer',
        email: 'blocked@example.com',
        status: 'new',
        score: 50,
        estimatedValue: 1000,
        tags: [],
        customFields: [],
      }),
    ).rejects.toThrow('CRM manager access required');

    expect(accounts).toHaveLength(1);
  });

  it('converts a lead into an account, contact, and deal exactly once', async () => {
    const owner = await createUser('owner@example.com');
    const workspaceService = new WorkspaceService();
    const crmService = new CrmService();
    const workspace = await workspaceService.createWorkspace(owner._id, {
      name: 'Acme',
      visibility: 'private',
    });
    const workspaceId = new mongoose.Types.ObjectId(workspace.id);
    const lead = await crmService.createLead(workspaceId, owner._id, {
      companyName: 'Northstar',
      contactName: 'Nora North',
      email: 'nora@northstar.example',
      source: 'website',
      status: 'new',
      score: 82,
      estimatedValue: 24000,
      tags: ['inbound'],
      customFields: [],
    });

    const converted = await crmService.convertLead(new mongoose.Types.ObjectId(lead.id), owner._id);
    const leads = await crmService.listLeads(workspaceId, owner._id, { status: 'converted' });

    expect(converted.account.name).toBe('Northstar');
    expect(converted.contact.email).toBe('nora@northstar.example');
    expect(converted.deal.value).toBe(24000);
    expect(converted.deal.probability).toBe(82);
    expect(leads[0]?.convertedDealId).toBe(converted.deal.id);
    await expect(
      crmService.convertLead(new mongoose.Types.ObjectId(lead.id), owner._id),
    ).rejects.toThrow('Lead is already converted');
  });
});
