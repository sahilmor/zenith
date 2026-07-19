import type { FilterQuery, Types } from 'mongoose';
import {
  CrmAccountModel,
  CrmActivityModel,
  CrmContactModel,
  CrmDealModel,
  CrmLeadModel,
  type CrmAccountDocument,
  type CrmActivityDocument,
  type CrmContactDocument,
  type CrmDealDocument,
  type CrmLeadDocument,
} from '../models/crm.model.js';

export class CrmRepository {
  public async createAccount(input: Record<string, unknown>): Promise<CrmAccountDocument> {
    return CrmAccountModel.create(input) as Promise<CrmAccountDocument>;
  }

  public async findAccount(id: Types.ObjectId): Promise<CrmAccountDocument | null> {
    return CrmAccountModel.findById(id).exec() as Promise<CrmAccountDocument | null>;
  }

  public async findAccountByDomain(
    workspaceId: Types.ObjectId,
    domain: string,
  ): Promise<CrmAccountDocument | null> {
    return CrmAccountModel.findOne({
      workspaceId,
      domain,
    }).exec() as Promise<CrmAccountDocument | null>;
  }

  public async listAccounts(input: {
    workspaceId: Types.ObjectId;
    search?: string;
  }): Promise<CrmAccountDocument[]> {
    const query: FilterQuery<CrmAccountDocument> = {
      workspaceId: input.workspaceId,
      archived: false,
    };
    if (input.search) {
      query.$or = [
        { name: { $regex: input.search, $options: 'i' } },
        { domain: { $regex: input.search, $options: 'i' } },
        { industry: { $regex: input.search, $options: 'i' } },
      ];
    }
    return CrmAccountModel.find(query).sort({ updatedAt: -1 }).limit(200).exec() as Promise<
      CrmAccountDocument[]
    >;
  }

  public async updateAccount(
    id: Types.ObjectId,
    update: Record<string, unknown>,
  ): Promise<CrmAccountDocument | null> {
    return CrmAccountModel.findByIdAndUpdate(id, update, {
      new: true,
    }).exec() as Promise<CrmAccountDocument | null>;
  }

  public async createContact(input: Record<string, unknown>): Promise<CrmContactDocument> {
    return CrmContactModel.create(input) as Promise<CrmContactDocument>;
  }

  public async findContact(id: Types.ObjectId): Promise<CrmContactDocument | null> {
    return CrmContactModel.findById(id).exec() as Promise<CrmContactDocument | null>;
  }

  public async findContactByEmail(
    workspaceId: Types.ObjectId,
    email: string,
  ): Promise<CrmContactDocument | null> {
    return CrmContactModel.findOne({
      workspaceId,
      email,
    }).exec() as Promise<CrmContactDocument | null>;
  }

  public async listContacts(input: {
    workspaceId: Types.ObjectId;
    accountId?: Types.ObjectId;
    search?: string;
  }): Promise<CrmContactDocument[]> {
    const query: FilterQuery<CrmContactDocument> = {
      workspaceId: input.workspaceId,
      archived: false,
    };
    if (input.accountId) query.accountId = input.accountId;
    if (input.search) {
      query.$or = [
        { firstName: { $regex: input.search, $options: 'i' } },
        { lastName: { $regex: input.search, $options: 'i' } },
        { email: { $regex: input.search, $options: 'i' } },
      ];
    }
    return CrmContactModel.find(query).sort({ updatedAt: -1 }).limit(300).exec() as Promise<
      CrmContactDocument[]
    >;
  }

  public async createLead(input: Record<string, unknown>): Promise<CrmLeadDocument> {
    return CrmLeadModel.create(input) as Promise<CrmLeadDocument>;
  }

  public async findLead(id: Types.ObjectId): Promise<CrmLeadDocument | null> {
    return CrmLeadModel.findById(id).exec() as Promise<CrmLeadDocument | null>;
  }

  public async listLeads(input: {
    workspaceId: Types.ObjectId;
    status?: string;
    search?: string;
  }): Promise<CrmLeadDocument[]> {
    const query: FilterQuery<CrmLeadDocument> = { workspaceId: input.workspaceId, archived: false };
    if (input.status) query.status = input.status;
    if (input.search) {
      query.$or = [
        { companyName: { $regex: input.search, $options: 'i' } },
        { contactName: { $regex: input.search, $options: 'i' } },
        { email: { $regex: input.search, $options: 'i' } },
      ];
    }
    return CrmLeadModel.find(query).sort({ score: -1, updatedAt: -1 }).limit(300).exec() as Promise<
      CrmLeadDocument[]
    >;
  }

  public async updateLead(
    id: Types.ObjectId,
    update: Record<string, unknown>,
  ): Promise<CrmLeadDocument | null> {
    return CrmLeadModel.findByIdAndUpdate(id, update, {
      new: true,
    }).exec() as Promise<CrmLeadDocument | null>;
  }

  public async createDeal(input: Record<string, unknown>): Promise<CrmDealDocument> {
    return CrmDealModel.create(input) as Promise<CrmDealDocument>;
  }

  public async findDeal(id: Types.ObjectId): Promise<CrmDealDocument | null> {
    return CrmDealModel.findById(id).exec() as Promise<CrmDealDocument | null>;
  }

  public async listDeals(input: {
    workspaceId: Types.ObjectId;
    accountId?: Types.ObjectId;
    stage?: string;
  }): Promise<CrmDealDocument[]> {
    const query: FilterQuery<CrmDealDocument> = { workspaceId: input.workspaceId, archived: false };
    if (input.accountId) query.accountId = input.accountId;
    if (input.stage) query.stage = input.stage;
    return CrmDealModel.find(query)
      .sort({ expectedCloseDate: 1, updatedAt: -1 })
      .limit(300)
      .exec() as Promise<CrmDealDocument[]>;
  }

  public async updateDeal(
    id: Types.ObjectId,
    update: Record<string, unknown>,
  ): Promise<CrmDealDocument | null> {
    return CrmDealModel.findByIdAndUpdate(id, update, {
      new: true,
    }).exec() as Promise<CrmDealDocument | null>;
  }

  public async createActivity(input: Record<string, unknown>): Promise<CrmActivityDocument> {
    return CrmActivityModel.create(input) as Promise<CrmActivityDocument>;
  }

  public async listActivities(input: {
    workspaceId: Types.ObjectId;
    accountId?: Types.ObjectId;
    contactId?: Types.ObjectId;
    leadId?: Types.ObjectId;
    dealId?: Types.ObjectId;
  }): Promise<CrmActivityDocument[]> {
    const query: FilterQuery<CrmActivityDocument> = { workspaceId: input.workspaceId };
    if (input.accountId) query.accountId = input.accountId;
    if (input.contactId) query.contactId = input.contactId;
    if (input.leadId) query.leadId = input.leadId;
    if (input.dealId) query.dealId = input.dealId;
    return CrmActivityModel.find(query).sort({ occurredAt: -1 }).limit(300).exec() as Promise<
      CrmActivityDocument[]
    >;
  }
}
