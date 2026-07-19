import type {
  CrmAccountSummary,
  CrmActivitySummary,
  CrmContactSummary,
  CrmDashboardSummary,
  CrmDealSummary,
  CrmLeadSummary,
  CrmNextAction,
  RealtimeAction,
  RealtimeResource,
  WorkspaceRole,
} from '@pm/types';
import { Types } from 'mongoose';
import { ActivityService } from '../../activity/services/activity.service.js';
import type { ActivityEventName } from '../../activity/models/activity-event.model.js';
import { entitlementService } from '../../billing/services/entitlement.service.js';
import { auditLogService } from '../../ops/services/audit-log.service.js';
import { ProjectRepository } from '../../projects/repositories/project.repository.js';
import { TaskRepository } from '../../tasks/repositories/task.repository.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import { realtimeService } from '../../../sockets/realtime.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import type {
  CrmAccountDocument,
  CrmActivityDocument,
  CrmContactDocument,
  CrmDealDocument,
  CrmLeadDocument,
} from '../models/crm.model.js';
import { CrmRepository } from '../repositories/crm.repository.js';
import type {
  CreateAccountInput,
  CreateContactInput,
  CreateCrmActivityInput,
  CreateDealInput,
  CreateLeadInput,
  UpdateAccountInput,
  UpdateDealInput,
  UpdateLeadInput,
} from '../validation/crm.validation.js';

const crmWriteRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager']);

const closedStages = new Set(['closed_won', 'closed_lost']);

const healthStatusForScore = (score: number): CrmAccountSummary['healthStatus'] => {
  if (score < 35) return 'critical';
  if (score < 60) return 'at_risk';
  if (score < 75) return 'watch';
  return 'healthy';
};

export class CrmService {
  public constructor(
    private readonly crm = new CrmRepository(),
    private readonly workspaces = new WorkspaceRepository(),
    private readonly projects = new ProjectRepository(),
    private readonly tasks = new TaskRepository(),
    private readonly activity = new ActivityService(),
  ) {}

  public async createAccount(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: CreateAccountInput,
  ): Promise<CrmAccountSummary> {
    await this.requireCrmWrite(workspaceId, actorId);
    await entitlementService.requireWithinLimit(workspaceId, 'crmAccounts');
    const ownerId = input.ownerId ? this.toObjectId(input.ownerId) : actorId;
    await this.requireWorkspaceMembership(workspaceId, ownerId);
    if (input.domain) {
      const duplicate = await this.crm.findAccountByDomain(workspaceId, input.domain);
      if (duplicate) throw new ConflictError('An account with this domain already exists');
    }
    if (input.onboardingProjectId) {
      await this.ensureProject(workspaceId, this.toObjectId(input.onboardingProjectId));
    }
    const account = await this.crm.createAccount({
      workspaceId,
      name: input.name,
      domain: input.domain ?? null,
      website: input.website ?? null,
      industry: input.industry ?? null,
      size: input.size ?? null,
      status: input.status,
      ownerId,
      healthScore: input.healthScore,
      healthStatus: healthStatusForScore(input.healthScore),
      lifecycleStage: input.lifecycleStage,
      renewalDate: input.renewalDate ? new Date(input.renewalDate) : null,
      onboardingProjectId: input.onboardingProjectId
        ? this.toObjectId(input.onboardingProjectId)
        : null,
      tags: input.tags,
      customFields: input.customFields,
      createdBy: actorId,
    });
    await this.record(workspaceId, actorId, 'crm.account.created', {
      accountId: account.id,
      name: account.name,
    });
    await auditLogService.record({
      actorId,
      workspaceId,
      targetType: 'crm_account',
      targetId: account.id,
      action: 'crm.account.created',
      metadata: { name: account.name },
    });
    const summary = this.toAccountSummary(account);
    this.emit('crm_account', 'created', workspaceId, actorId, summary);
    return summary;
  }

  public async listAccounts(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    search?: string,
  ): Promise<CrmAccountSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, actorId);
    await entitlementService.requireFeature(workspaceId, 'crm');
    const accounts = await this.crm.listAccounts({ workspaceId, ...(search ? { search } : {}) });
    return accounts.map((account) => this.toAccountSummary(account));
  }

  public async updateAccount(
    accountId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: UpdateAccountInput,
  ): Promise<CrmAccountSummary> {
    const account = await this.requireAccount(accountId, actorId, true);
    const update: Record<string, unknown> = { ...input };
    if (input.ownerId)
      await this.requireWorkspaceMembership(account.workspaceId, this.toObjectId(input.ownerId));
    if (input.onboardingProjectId)
      await this.ensureProject(account.workspaceId, this.toObjectId(input.onboardingProjectId));
    if (input.healthScore !== undefined)
      update.healthStatus = healthStatusForScore(input.healthScore);
    if (input.renewalDate !== undefined)
      update.renewalDate = input.renewalDate ? new Date(input.renewalDate) : null;
    if (input.onboardingProjectId !== undefined) {
      update.onboardingProjectId = input.onboardingProjectId
        ? this.toObjectId(input.onboardingProjectId)
        : null;
    }
    const updated = await this.crm.updateAccount(accountId, update);
    if (!updated) throw new NotFoundError('Account not found');
    await this.record(account.workspaceId, actorId, 'crm.account.updated', {
      accountId: account.id,
      fields: Object.keys(input),
    });
    const summary = this.toAccountSummary(updated);
    this.emit('crm_account', 'updated', account.workspaceId, actorId, summary);
    return summary;
  }

  public async createContact(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: CreateContactInput,
  ): Promise<CrmContactSummary> {
    await this.requireCrmWrite(workspaceId, actorId);
    await entitlementService.requireWithinLimit(workspaceId, 'crmContacts');
    const ownerId = input.ownerId ? this.toObjectId(input.ownerId) : actorId;
    await this.requireWorkspaceMembership(workspaceId, ownerId);
    if (input.accountId) await this.ensureAccount(workspaceId, this.toObjectId(input.accountId));
    const duplicate = await this.crm.findContactByEmail(workspaceId, input.email);
    if (duplicate) throw new ConflictError('A contact with this email already exists');
    const contact = await this.crm.createContact({
      workspaceId,
      accountId: input.accountId ? this.toObjectId(input.accountId) : null,
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      email: input.email,
      phone: input.phone ?? null,
      title: input.title ?? null,
      ownerId,
      tags: input.tags,
      customFields: input.customFields,
      createdBy: actorId,
    });
    await this.record(workspaceId, actorId, 'crm.contact.created', {
      contactId: contact.id,
      email: contact.email,
    });
    const summary = this.toContactSummary(contact);
    this.emit('crm_contact', 'created', workspaceId, actorId, summary);
    return summary;
  }

  public async listContacts(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: { accountId?: Types.ObjectId; search?: string },
  ): Promise<CrmContactSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, actorId);
    await entitlementService.requireFeature(workspaceId, 'crm');
    if (input.accountId) await this.ensureAccount(workspaceId, input.accountId);
    const contacts = await this.crm.listContacts({ workspaceId, ...input });
    return contacts.map((contact) => this.toContactSummary(contact));
  }

  public async createLead(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: CreateLeadInput,
  ): Promise<CrmLeadSummary> {
    await this.requireCrmWrite(workspaceId, actorId);
    await entitlementService.requireWithinLimit(workspaceId, 'crmLeads');
    const ownerId = input.ownerId ? this.toObjectId(input.ownerId) : actorId;
    await this.requireWorkspaceMembership(workspaceId, ownerId);
    const lead = await this.crm.createLead({
      workspaceId,
      companyName: input.companyName,
      contactName: input.contactName,
      email: input.email,
      source: input.source ?? null,
      status: input.status,
      score: input.score,
      estimatedValue: input.estimatedValue,
      ownerId,
      tags: input.tags,
      customFields: input.customFields,
      createdBy: actorId,
    });
    await this.record(workspaceId, actorId, 'crm.lead.created', {
      leadId: lead.id,
      companyName: lead.companyName,
    });
    const summary = this.toLeadSummary(lead);
    this.emit('crm_lead', 'created', workspaceId, actorId, summary);
    return summary;
  }

  public async listLeads(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: { status?: string; search?: string },
  ): Promise<CrmLeadSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, actorId);
    await entitlementService.requireFeature(workspaceId, 'crm');
    const leads = await this.crm.listLeads({ workspaceId, ...input });
    return leads.map((lead) => this.toLeadSummary(lead));
  }

  public async updateLead(
    leadId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: UpdateLeadInput,
  ): Promise<CrmLeadSummary> {
    const lead = await this.requireLead(leadId, actorId, true);
    const updated = await this.crm.updateLead(leadId, input);
    if (!updated) throw new NotFoundError('Lead not found');
    await this.record(lead.workspaceId, actorId, 'crm.lead.updated', {
      leadId: lead.id,
      fields: Object.keys(input),
    });
    const summary = this.toLeadSummary(updated);
    this.emit('crm_lead', 'updated', lead.workspaceId, actorId, summary);
    return summary;
  }

  public async convertLead(
    leadId: Types.ObjectId,
    actorId: Types.ObjectId,
  ): Promise<{ account: CrmAccountSummary; contact: CrmContactSummary; deal: CrmDealSummary }> {
    const lead = await this.requireLead(leadId, actorId, true);
    if (lead.status === 'converted') throw new ConflictError('Lead is already converted');
    const domain = lead.email.split('@')[1]?.toLowerCase() ?? null;
    const account = await this.crm.createAccount({
      workspaceId: lead.workspaceId,
      name: lead.companyName,
      domain,
      status: 'prospect',
      ownerId: lead.ownerId,
      healthScore: 75,
      healthStatus: 'healthy',
      lifecycleStage: 'sales',
      tags: lead.tags,
      customFields: [],
      createdBy: actorId,
    });
    const [firstName, ...lastParts] = lead.contactName.split(' ');
    const contact = await this.crm.createContact({
      workspaceId: lead.workspaceId,
      accountId: account._id,
      firstName: firstName ?? lead.contactName,
      lastName: lastParts.join(' ') || null,
      email: lead.email,
      ownerId: lead.ownerId,
      tags: lead.tags,
      customFields: [],
      createdBy: actorId,
    });
    const deal = await this.crm.createDeal({
      workspaceId: lead.workspaceId,
      accountId: account._id,
      contactId: contact._id,
      name: `${lead.companyName} opportunity`,
      value: lead.estimatedValue,
      ownerId: lead.ownerId,
      stage: 'qualification',
      forecastCategory: 'pipeline',
      probability: Math.max(10, Math.min(90, lead.score)),
      tags: lead.tags,
      customFields: [],
      createdBy: actorId,
    });
    await this.crm.updateLead(leadId, {
      status: 'converted',
      convertedAccountId: account._id,
      convertedContactId: contact._id,
      convertedDealId: deal._id,
    });
    await this.record(lead.workspaceId, actorId, 'crm.lead.converted', {
      leadId: lead.id,
      accountId: account.id,
      contactId: contact.id,
      dealId: deal.id,
    });
    this.emit('crm_lead', 'updated', lead.workspaceId, actorId, {
      id: lead.id,
      status: 'converted',
    });
    return {
      account: this.toAccountSummary(account),
      contact: this.toContactSummary(contact),
      deal: this.toDealSummary(deal),
    };
  }

  public async createDeal(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: CreateDealInput,
  ): Promise<CrmDealSummary> {
    await this.requireCrmWrite(workspaceId, actorId);
    await entitlementService.requireWithinLimit(workspaceId, 'crmDeals');
    const ownerId = input.ownerId ? this.toObjectId(input.ownerId) : actorId;
    await this.requireWorkspaceMembership(workspaceId, ownerId);
    await this.ensureAccount(workspaceId, this.toObjectId(input.accountId));
    if (input.contactId) await this.ensureContact(workspaceId, this.toObjectId(input.contactId));
    if (input.projectId) await this.ensureProject(workspaceId, this.toObjectId(input.projectId));
    const deal = await this.crm.createDeal({
      workspaceId,
      accountId: this.toObjectId(input.accountId),
      contactId: input.contactId ? this.toObjectId(input.contactId) : null,
      projectId: input.projectId ? this.toObjectId(input.projectId) : null,
      name: input.name,
      stage: input.stage,
      forecastCategory: input.forecastCategory,
      value: input.value,
      currency: input.currency,
      probability: input.probability,
      expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
      ownerId,
      nextStep: input.nextStep ?? null,
      tags: input.tags,
      customFields: input.customFields,
      createdBy: actorId,
    });
    await this.record(workspaceId, actorId, 'crm.deal.created', {
      dealId: deal.id,
      value: deal.value,
    });
    const summary = this.toDealSummary(deal);
    this.emit('crm_deal', 'created', workspaceId, actorId, summary);
    return summary;
  }

  public async updateDeal(
    dealId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: UpdateDealInput,
  ): Promise<CrmDealSummary> {
    const deal = await this.requireDeal(dealId, actorId, true);
    const update: Record<string, unknown> = { ...input };
    if (input.expectedCloseDate !== undefined)
      update.expectedCloseDate = input.expectedCloseDate ? new Date(input.expectedCloseDate) : null;
    if (input.accountId)
      await this.ensureAccount(deal.workspaceId, this.toObjectId(input.accountId));
    if (input.contactId)
      await this.ensureContact(deal.workspaceId, this.toObjectId(input.contactId));
    if (input.projectId)
      await this.ensureProject(deal.workspaceId, this.toObjectId(input.projectId));
    const updated = await this.crm.updateDeal(dealId, update);
    if (!updated) throw new NotFoundError('Deal not found');
    await this.record(deal.workspaceId, actorId, 'crm.deal.updated', {
      dealId: deal.id,
      fields: Object.keys(input),
    });
    const summary = this.toDealSummary(updated);
    this.emit('crm_deal', 'updated', deal.workspaceId, actorId, summary);
    return summary;
  }

  public async listDeals(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: { accountId?: Types.ObjectId; stage?: string },
  ): Promise<CrmDealSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, actorId);
    await entitlementService.requireFeature(workspaceId, 'crm');
    if (input.accountId) await this.ensureAccount(workspaceId, input.accountId);
    const deals = await this.crm.listDeals({ workspaceId, ...input });
    return deals.map((deal) => this.toDealSummary(deal));
  }

  public async createActivity(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: CreateCrmActivityInput,
  ): Promise<CrmActivitySummary> {
    await this.requireWorkspaceMembership(workspaceId, actorId);
    await entitlementService.requireFeature(workspaceId, 'crm');
    const ownerId = input.ownerId ? this.toObjectId(input.ownerId) : actorId;
    await this.requireWorkspaceMembership(workspaceId, ownerId);
    await this.ensureTargets(workspaceId, input);
    const activity = await this.crm.createActivity({
      workspaceId,
      accountId: input.accountId ? this.toObjectId(input.accountId) : null,
      contactId: input.contactId ? this.toObjectId(input.contactId) : null,
      leadId: input.leadId ? this.toObjectId(input.leadId) : null,
      dealId: input.dealId ? this.toObjectId(input.dealId) : null,
      taskId: input.taskId ? this.toObjectId(input.taskId) : null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      completedAt: input.completedAt ? new Date(input.completedAt) : null,
      ownerId,
      createdBy: actorId,
    });
    await this.record(workspaceId, actorId, 'crm.activity.created', {
      activityId: activity.id,
      type: activity.type,
    });
    const summary = this.toActivitySummary(activity);
    this.emit('crm_activity', 'created', workspaceId, actorId, summary);
    return summary;
  }

  public async getDashboard(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
  ): Promise<CrmDashboardSummary> {
    await this.requireWorkspaceMembership(workspaceId, actorId);
    await entitlementService.requireFeature(workspaceId, 'crm');
    const [accounts, leads, deals, activities] = await Promise.all([
      this.crm.listAccounts({ workspaceId }),
      this.crm.listLeads({ workspaceId }),
      this.crm.listDeals({ workspaceId }),
      this.crm.listActivities({ workspaceId }),
    ]);
    const openDeals = deals.filter((deal) => !closedStages.has(deal.stage));
    const weightedPipelineValue = openDeals.reduce(
      (sum, deal) => sum + (deal.value * deal.probability) / 100,
      0,
    );
    const pipelineValue = openDeals.reduce((sum, deal) => sum + deal.value, 0);
    const wonValue = deals
      .filter((deal) => deal.stage === 'closed_won')
      .reduce((sum, deal) => sum + deal.value, 0);
    const atRiskAccounts = accounts.filter(
      (account) => account.healthStatus === 'at_risk' || account.healthStatus === 'critical',
    );
    const dealsByStage = Object.entries(
      deals.reduce<Record<string, number>>((acc, deal) => {
        acc[deal.stage] = (acc[deal.stage] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([stage, count]) => ({ stage, count }));
    return {
      workspaceId: workspaceId.toString(),
      generatedAt: new Date().toISOString(),
      accountCount: accounts.length,
      contactCount: await this.crm.listContacts({ workspaceId }).then((items) => items.length),
      leadCount: leads.length,
      openDealCount: openDeals.length,
      pipelineValue,
      weightedPipelineValue,
      wonValue,
      atRiskAccountCount: atRiskAccounts.length,
      dealsByStage,
      recentActivities: activities.slice(0, 10).map((activity) => this.toActivitySummary(activity)),
      nextActions: this.buildNextActions(accounts, leads, deals, activities),
    };
  }

  private buildNextActions(
    accounts: CrmAccountDocument[],
    leads: CrmLeadDocument[],
    deals: CrmDealDocument[],
    activities: CrmActivityDocument[],
  ): CrmNextAction[] {
    const actions: CrmNextAction[] = [];
    const now = new Date();
    leads
      .filter((lead) => lead.status === 'new' && lead.score >= 60)
      .slice(0, 3)
      .forEach((lead) =>
        actions.push({
          id: `lead-${lead.id}`,
          title: `Qualify ${lead.companyName}`,
          reason: 'High-scoring new lead has not been worked yet.',
          priority: 'high',
          entityType: 'lead',
          entityId: lead.id,
        }),
      );
    deals
      .filter(
        (deal) =>
          !closedStages.has(deal.stage) && deal.expectedCloseDate && deal.expectedCloseDate < now,
      )
      .slice(0, 3)
      .forEach((deal) =>
        actions.push({
          id: `deal-${deal.id}`,
          title: `Refresh close plan for ${deal.name}`,
          reason: 'Expected close date is in the past.',
          priority: 'high',
          entityType: 'deal',
          entityId: deal.id,
        }),
      );
    accounts
      .filter(
        (account) => account.healthStatus === 'at_risk' || account.healthStatus === 'critical',
      )
      .slice(0, 3)
      .forEach((account) =>
        actions.push({
          id: `account-${account.id}`,
          title: `Review customer health for ${account.name}`,
          reason: `Health score is ${account.healthScore}.`,
          priority: account.healthStatus === 'critical' ? 'high' : 'medium',
          entityType: 'account',
          entityId: account.id,
        }),
      );
    if (actions.length === 0 && activities.length === 0) {
      actions.push({
        id: 'crm-first-activity',
        title: 'Log the first customer touchpoint',
        reason: 'CRM activity history is empty.',
        priority: 'medium',
        entityType: 'activity',
        entityId: null,
      });
    }
    return actions.slice(0, 8);
  }

  private async ensureTargets(
    workspaceId: Types.ObjectId,
    input: CreateCrmActivityInput,
  ): Promise<void> {
    if (input.accountId) await this.ensureAccount(workspaceId, this.toObjectId(input.accountId));
    if (input.contactId) await this.ensureContact(workspaceId, this.toObjectId(input.contactId));
    if (input.leadId) {
      const lead = await this.crm.findLead(this.toObjectId(input.leadId));
      if (!lead || !lead.workspaceId.equals(workspaceId)) throw new NotFoundError('Lead not found');
    }
    if (input.dealId) await this.ensureDeal(workspaceId, this.toObjectId(input.dealId));
    if (input.taskId) {
      const task = await this.tasks.findById(this.toObjectId(input.taskId));
      if (!task || !task.workspaceId.equals(workspaceId)) throw new NotFoundError('Task not found');
    }
  }

  private async ensureAccount(
    workspaceId: Types.ObjectId,
    accountId: Types.ObjectId,
  ): Promise<CrmAccountDocument> {
    const account = await this.crm.findAccount(accountId);
    if (!account || !account.workspaceId.equals(workspaceId) || account.archived)
      throw new NotFoundError('Account not found');
    return account;
  }

  private async ensureContact(
    workspaceId: Types.ObjectId,
    contactId: Types.ObjectId,
  ): Promise<CrmContactDocument> {
    const contact = await this.crm.findContact(contactId);
    if (!contact || !contact.workspaceId.equals(workspaceId) || contact.archived)
      throw new NotFoundError('Contact not found');
    return contact;
  }

  private async ensureDeal(
    workspaceId: Types.ObjectId,
    dealId: Types.ObjectId,
  ): Promise<CrmDealDocument> {
    const deal = await this.crm.findDeal(dealId);
    if (!deal || !deal.workspaceId.equals(workspaceId) || deal.archived)
      throw new NotFoundError('Deal not found');
    return deal;
  }

  private async ensureProject(
    workspaceId: Types.ObjectId,
    projectId: Types.ObjectId,
  ): Promise<void> {
    const project = await this.projects.findById(projectId);
    if (!project || !project.workspaceId.equals(workspaceId))
      throw new NotFoundError('Project not found');
  }

  private async requireAccount(
    accountId: Types.ObjectId,
    actorId: Types.ObjectId,
    write = false,
  ): Promise<CrmAccountDocument> {
    const account = await this.crm.findAccount(accountId);
    if (!account || account.archived) throw new NotFoundError('Account not found');
    if (write) await this.requireCrmWrite(account.workspaceId, actorId);
    else await this.requireWorkspaceMembership(account.workspaceId, actorId);
    return account;
  }

  private async requireLead(
    leadId: Types.ObjectId,
    actorId: Types.ObjectId,
    write = false,
  ): Promise<CrmLeadDocument> {
    const lead = await this.crm.findLead(leadId);
    if (!lead || lead.archived) throw new NotFoundError('Lead not found');
    if (write) await this.requireCrmWrite(lead.workspaceId, actorId);
    else await this.requireWorkspaceMembership(lead.workspaceId, actorId);
    return lead;
  }

  private async requireDeal(
    dealId: Types.ObjectId,
    actorId: Types.ObjectId,
    write = false,
  ): Promise<CrmDealDocument> {
    const deal = await this.crm.findDeal(dealId);
    if (!deal || deal.archived) throw new NotFoundError('Deal not found');
    if (write) await this.requireCrmWrite(deal.workspaceId, actorId);
    else await this.requireWorkspaceMembership(deal.workspaceId, actorId);
    return deal;
  }

  private async requireCrmWrite(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
  ): Promise<void> {
    const role = await this.requireWorkspaceMembership(workspaceId, actorId);
    await entitlementService.requireFeature(workspaceId, 'crm');
    if (!crmWriteRoles.has(role)) throw new ForbiddenError('CRM manager access required');
  }

  private async requireWorkspaceMembership(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<WorkspaceRole> {
    const [workspace, membership] = await Promise.all([
      this.workspaces.findWorkspaceById(workspaceId),
      this.workspaces.findMembership(workspaceId, userId),
    ]);
    if (!workspace || workspace.archived) throw new NotFoundError('Workspace not found');
    if (!membership || membership.status !== 'active')
      throw new ForbiddenError('Workspace access denied');
    return membership.role as WorkspaceRole;
  }

  private async record(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    event: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.activity.record({
      workspaceId,
      actorId,
      event: event as ActivityEventName,
      metadata,
    });
  }

  private emit(
    resource: RealtimeResource,
    action: RealtimeAction,
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    data: unknown,
  ): void {
    realtimeService.emitMutation({
      resource,
      action,
      workspaceId: workspaceId.toString(),
      actorId: actorId.toString(),
      data,
    });
  }

  private toObjectId(value: string): Types.ObjectId {
    return new Types.ObjectId(value);
  }

  private toAccountSummary(account: CrmAccountDocument): CrmAccountSummary {
    return {
      id: account.id,
      workspaceId: account.workspaceId.toString(),
      name: account.name,
      domain: account.domain ?? null,
      website: account.website ?? null,
      industry: account.industry ?? null,
      size: account.size ?? null,
      status: account.status,
      ownerId: account.ownerId.toString(),
      healthScore: account.healthScore,
      healthStatus: account.healthStatus,
      lifecycleStage: account.lifecycleStage,
      renewalDate: account.renewalDate?.toISOString() ?? null,
      onboardingProjectId: account.onboardingProjectId?.toString() ?? null,
      tags: account.tags,
      customFields: account.customFields.map((field) => ({
        key: field.key,
        value: field.value as string | number | boolean | string[] | null,
      })),
      archived: account.archived,
      createdBy: account.createdBy.toString(),
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  private toContactSummary(contact: CrmContactDocument): CrmContactSummary {
    return {
      id: contact.id,
      workspaceId: contact.workspaceId.toString(),
      accountId: contact.accountId?.toString() ?? null,
      firstName: contact.firstName,
      lastName: contact.lastName ?? null,
      email: contact.email,
      phone: contact.phone ?? null,
      title: contact.title ?? null,
      ownerId: contact.ownerId.toString(),
      tags: contact.tags,
      archived: contact.archived,
      createdBy: contact.createdBy.toString(),
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
    };
  }

  private toLeadSummary(lead: CrmLeadDocument): CrmLeadSummary {
    return {
      id: lead.id,
      workspaceId: lead.workspaceId.toString(),
      companyName: lead.companyName,
      contactName: lead.contactName,
      email: lead.email,
      source: lead.source ?? null,
      status: lead.status,
      score: lead.score,
      estimatedValue: lead.estimatedValue,
      ownerId: lead.ownerId.toString(),
      convertedAccountId: lead.convertedAccountId?.toString() ?? null,
      convertedContactId: lead.convertedContactId?.toString() ?? null,
      convertedDealId: lead.convertedDealId?.toString() ?? null,
      tags: lead.tags,
      archived: lead.archived,
      createdBy: lead.createdBy.toString(),
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    };
  }

  private toDealSummary(deal: CrmDealDocument): CrmDealSummary {
    return {
      id: deal.id,
      workspaceId: deal.workspaceId.toString(),
      accountId: deal.accountId.toString(),
      contactId: deal.contactId?.toString() ?? null,
      projectId: deal.projectId?.toString() ?? null,
      name: deal.name,
      stage: deal.stage,
      forecastCategory: deal.forecastCategory,
      value: deal.value,
      currency: deal.currency,
      probability: deal.probability,
      expectedCloseDate: deal.expectedCloseDate?.toISOString() ?? null,
      ownerId: deal.ownerId.toString(),
      nextStep: deal.nextStep ?? null,
      tags: deal.tags,
      archived: deal.archived,
      createdBy: deal.createdBy.toString(),
      createdAt: deal.createdAt.toISOString(),
      updatedAt: deal.updatedAt.toISOString(),
    };
  }

  private toActivitySummary(activity: CrmActivityDocument): CrmActivitySummary {
    return {
      id: activity.id,
      workspaceId: activity.workspaceId.toString(),
      accountId: activity.accountId?.toString() ?? null,
      contactId: activity.contactId?.toString() ?? null,
      leadId: activity.leadId?.toString() ?? null,
      dealId: activity.dealId?.toString() ?? null,
      taskId: activity.taskId?.toString() ?? null,
      type: activity.type,
      title: activity.title,
      body: activity.body ?? null,
      occurredAt: activity.occurredAt.toISOString(),
      dueAt: activity.dueAt?.toISOString() ?? null,
      completedAt: activity.completedAt?.toISOString() ?? null,
      ownerId: activity.ownerId.toString(),
      createdBy: activity.createdBy.toString(),
      createdAt: activity.createdAt.toISOString(),
      updatedAt: activity.updatedAt.toISOString(),
    };
  }
}
