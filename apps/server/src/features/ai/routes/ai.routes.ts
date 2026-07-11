import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  aiSearch,
  chat,
  createAutomation,
  createPrompt,
  deleteAutomation,
  deletePrompt,
  listAutomations,
  listConversations,
  listPrompts,
  runAiAction,
  streamChat,
  testAutomation,
  updateAutomation,
  updateConversation,
  updatePrompt,
} from '../controllers/ai.controller.js';
import {
  aiActionSchema,
  aiSearchSchema,
  automationParamsSchema,
  automationRuleSchema,
  chatSchema,
  listAutomationsSchema,
  listConversationsSchema,
  listPromptsSchema,
  promptParamsSchema,
  promptSchema,
  updateAutomationRuleSchema,
  updateConversationSchema,
  updatePromptSchema,
} from '../validation/ai.validation.js';

export const aiRouter = Router();

aiRouter.use(verifyToken);

aiRouter.get('/conversations', validate(listConversationsSchema), listConversations);
aiRouter.post('/chat', validate(chatSchema), chat);
aiRouter.post('/chat/stream', validate(chatSchema), streamChat);
aiRouter.patch(
  '/conversations/:conversationId',
  validate(updateConversationSchema),
  updateConversation,
);
aiRouter.post('/actions', validate(aiActionSchema), runAiAction);
aiRouter.post('/search', validate(aiSearchSchema), aiSearch);

aiRouter.get('/prompts', validate(listPromptsSchema), listPrompts);
aiRouter.post('/prompts', validate(promptSchema), createPrompt);
aiRouter.patch('/prompts/:promptId', validate(updatePromptSchema), updatePrompt);
aiRouter.delete('/prompts/:promptId', validate(promptParamsSchema), deletePrompt);

aiRouter.get('/automations', validate(listAutomationsSchema), listAutomations);
aiRouter.post('/automations', validate(automationRuleSchema), createAutomation);
aiRouter.patch('/automations/:ruleId', validate(updateAutomationRuleSchema), updateAutomation);
aiRouter.delete('/automations/:ruleId', validate(automationParamsSchema), deleteAutomation);
aiRouter.post('/automations/:ruleId/test', validate(automationParamsSchema), testAutomation);
