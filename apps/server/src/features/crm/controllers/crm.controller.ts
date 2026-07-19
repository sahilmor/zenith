import type { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';
import { sendSuccess } from '../../../utils/api-response.js';
import { BadRequestError, UnauthorizedError } from '../../../utils/app-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { CrmService } from '../services/crm.service.js';

const crmService = new CrmService();

const requireUserId = (request: Request): Types.ObjectId => {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user._id;
};

const paramObjectId = (value: string | undefined): Types.ObjectId => {
  if (!value) throw new BadRequestError('Missing route parameter');
  return new Types.ObjectId(value);
};

const queryString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const queryObjectId = (value: unknown): Types.ObjectId | undefined =>
  typeof value === 'string' && value.length > 0 ? new Types.ObjectId(value) : undefined;

const contactFilters = (request: Request): { accountId?: Types.ObjectId; search?: string } => {
  const filters: { accountId?: Types.ObjectId; search?: string } = {};
  const accountId = queryObjectId(request.query.accountId);
  const search = queryString(request.query.search);
  if (accountId) filters.accountId = accountId;
  if (search) filters.search = search;
  return filters;
};

const leadFilters = (request: Request): { status?: string; search?: string } => {
  const filters: { status?: string; search?: string } = {};
  const status = queryString(request.query.status);
  const search = queryString(request.query.search);
  if (status) filters.status = status;
  if (search) filters.search = search;
  return filters;
};

const dealFilters = (request: Request): { accountId?: Types.ObjectId; stage?: string } => {
  const filters: { accountId?: Types.ObjectId; stage?: string } = {};
  const accountId = queryObjectId(request.query.accountId);
  const stage = queryString(request.query.stage);
  if (accountId) filters.accountId = accountId;
  if (stage) filters.stage = stage;
  return filters;
};

export const getCrmDashboard: RequestHandler = asyncHandler(async (request, response) => {
  const dashboard = await crmService.getDashboard(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'CRM dashboard retrieved', dashboard);
});

export const createAccount: RequestHandler = asyncHandler(async (request, response) => {
  const account = await crmService.createAccount(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Account created', account);
});

export const listAccounts: RequestHandler = asyncHandler(async (request, response) => {
  const accounts = await crmService.listAccounts(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    queryString(request.query.search),
  );
  sendSuccess(response, 200, 'Accounts retrieved', accounts);
});

export const updateAccount: RequestHandler = asyncHandler(async (request, response) => {
  const account = await crmService.updateAccount(
    paramObjectId(request.params.accountId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Account updated', account);
});

export const createContact: RequestHandler = asyncHandler(async (request, response) => {
  const contact = await crmService.createContact(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Contact created', contact);
});

export const listContacts: RequestHandler = asyncHandler(async (request, response) => {
  const contacts = await crmService.listContacts(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    contactFilters(request),
  );
  sendSuccess(response, 200, 'Contacts retrieved', contacts);
});

export const createLead: RequestHandler = asyncHandler(async (request, response) => {
  const lead = await crmService.createLead(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Lead created', lead);
});

export const listLeads: RequestHandler = asyncHandler(async (request, response) => {
  const leads = await crmService.listLeads(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    leadFilters(request),
  );
  sendSuccess(response, 200, 'Leads retrieved', leads);
});

export const updateLead: RequestHandler = asyncHandler(async (request, response) => {
  const lead = await crmService.updateLead(
    paramObjectId(request.params.leadId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Lead updated', lead);
});

export const convertLead: RequestHandler = asyncHandler(async (request, response) => {
  const result = await crmService.convertLead(
    paramObjectId(request.params.leadId),
    requireUserId(request),
  );
  sendSuccess(response, 201, 'Lead converted', result);
});

export const createDeal: RequestHandler = asyncHandler(async (request, response) => {
  const deal = await crmService.createDeal(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Deal created', deal);
});

export const listDeals: RequestHandler = asyncHandler(async (request, response) => {
  const deals = await crmService.listDeals(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    dealFilters(request),
  );
  sendSuccess(response, 200, 'Deals retrieved', deals);
});

export const updateDeal: RequestHandler = asyncHandler(async (request, response) => {
  const deal = await crmService.updateDeal(
    paramObjectId(request.params.dealId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Deal updated', deal);
});

export const createCrmActivity: RequestHandler = asyncHandler(async (request, response) => {
  const activity = await crmService.createActivity(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'CRM activity created', activity);
});
