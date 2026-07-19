import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  convertLead,
  createAccount,
  createContact,
  createCrmActivity,
  createDeal,
  createLead,
  getCrmDashboard,
  listAccounts,
  listContacts,
  listDeals,
  listLeads,
  updateAccount,
  updateDeal,
  updateLead,
} from '../controllers/crm.controller.js';
import {
  createAccountSchema,
  createContactSchema,
  createCrmActivitySchema,
  createDealSchema,
  createLeadSchema,
  crmLeadParamsSchema,
  updateAccountSchema,
  updateDealSchema,
  updateLeadSchema,
  workspaceCrmParamsSchema,
} from '../validation/crm.validation.js';

export const crmRouter = Router();

crmRouter.use(verifyToken);

crmRouter.get('/workspaces/:workspaceId/crm', validate(workspaceCrmParamsSchema), getCrmDashboard);
crmRouter.get(
  '/workspaces/:workspaceId/crm/accounts',
  validate(workspaceCrmParamsSchema),
  listAccounts,
);
crmRouter.post(
  '/workspaces/:workspaceId/crm/accounts',
  validate(createAccountSchema),
  createAccount,
);
crmRouter.patch('/crm/accounts/:accountId', validate(updateAccountSchema), updateAccount);

crmRouter.get(
  '/workspaces/:workspaceId/crm/contacts',
  validate(workspaceCrmParamsSchema),
  listContacts,
);
crmRouter.post(
  '/workspaces/:workspaceId/crm/contacts',
  validate(createContactSchema),
  createContact,
);

crmRouter.get('/workspaces/:workspaceId/crm/leads', validate(workspaceCrmParamsSchema), listLeads);
crmRouter.post('/workspaces/:workspaceId/crm/leads', validate(createLeadSchema), createLead);
crmRouter.patch('/crm/leads/:leadId', validate(updateLeadSchema), updateLead);
crmRouter.post('/crm/leads/:leadId/convert', validate(crmLeadParamsSchema), convertLead);

crmRouter.get('/workspaces/:workspaceId/crm/deals', validate(workspaceCrmParamsSchema), listDeals);
crmRouter.post('/workspaces/:workspaceId/crm/deals', validate(createDealSchema), createDeal);
crmRouter.patch('/crm/deals/:dealId', validate(updateDealSchema), updateDeal);

crmRouter.post(
  '/workspaces/:workspaceId/crm/activities',
  validate(createCrmActivitySchema),
  createCrmActivity,
);
