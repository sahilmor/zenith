import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  createAutomation,
  deleteAutomation,
  listAutomations,
  testAutomation,
  updateAutomation,
} from '../controllers/automation.controller.js';
import {
  automationParamsSchema,
  automationRuleSchema,
  listAutomationsSchema,
  updateAutomationRuleSchema,
} from '../validation/automation.validation.js';

export const automationRouter = Router();

automationRouter.use(verifyToken);
automationRouter.get('/', validate(listAutomationsSchema), listAutomations);
automationRouter.post('/', validate(automationRuleSchema), createAutomation);
automationRouter.patch('/:ruleId', validate(updateAutomationRuleSchema), updateAutomation);
automationRouter.delete('/:ruleId', validate(automationParamsSchema), deleteAutomation);
automationRouter.post('/:ruleId/test', validate(automationParamsSchema), testAutomation);
