import type { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';
import { sendSuccess } from '../../../utils/api-response.js';
import { BadRequestError, UnauthorizedError } from '../../../utils/app-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { streamText } from '../providers/ai-provider.js';
import { AiService } from '../services/ai.service.js';
import { automationService } from '../services/automation.service.js';

const aiService = new AiService();

const requireUserId = (request: Request): Types.ObjectId => {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user._id;
};

const objectId = (value: string | undefined): Types.ObjectId => {
  if (!value) throw new BadRequestError('Missing route parameter');
  return new Types.ObjectId(value);
};

const queryObjectId = (value: unknown): Types.ObjectId | undefined =>
  typeof value === 'string' ? new Types.ObjectId(value) : undefined;

export const listConversations: RequestHandler = asyncHandler(async (request, response) => {
  const workspaceId = queryObjectId(request.query.workspaceId);
  if (!workspaceId) throw new BadRequestError('workspaceId is required');
  const conversations = await aiService.listConversations(workspaceId, requireUserId(request));
  sendSuccess(response, 200, 'AI conversations retrieved', conversations);
});

export const chat: RequestHandler = asyncHandler(async (request, response) => {
  const conversation = await aiService.chat(requireUserId(request), request.body);
  sendSuccess(response, 200, 'AI response generated', conversation);
});

export const streamChat: RequestHandler = asyncHandler(async (request, response) => {
  const conversation = await aiService.chat(requireUserId(request), request.body);
  const assistant = [...conversation.messages]
    .reverse()
    .find((message) => message.role === 'assistant');
  response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.flushHeaders?.();
  response.write(`data: ${JSON.stringify({ conversationId: conversation.id })}\n\n`);
  for await (const token of streamText(assistant?.content ?? '')) {
    response.write(`data: ${JSON.stringify({ token })}\n\n`);
  }
  response.write('data: [DONE]\n\n');
  response.end();
});

export const updateConversation: RequestHandler = asyncHandler(async (request, response) => {
  const conversation = await aiService.updateConversation(
    objectId(request.params.conversationId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'AI conversation updated', conversation);
});

export const runAiAction: RequestHandler = asyncHandler(async (request, response) => {
  const result = await aiService.runAction(requireUserId(request), request.body);
  sendSuccess(response, 200, 'AI action completed', result);
});

export const aiSearch: RequestHandler = asyncHandler(async (request, response) => {
  const result = await aiService.search(requireUserId(request), request.body);
  sendSuccess(response, 200, 'AI search completed', result);
});

export const listPrompts: RequestHandler = asyncHandler(async (request, response) => {
  const workspaceId = queryObjectId(request.query.workspaceId);
  if (!workspaceId) throw new BadRequestError('workspaceId is required');
  const prompts = await aiService.listPrompts(
    workspaceId,
    requireUserId(request),
    queryObjectId(request.query.projectId),
  );
  sendSuccess(response, 200, 'Prompts retrieved', prompts);
});

export const createPrompt: RequestHandler = asyncHandler(async (request, response) => {
  const prompt = await aiService.createPrompt(requireUserId(request), request.body);
  sendSuccess(response, 201, 'Prompt created', prompt);
});

export const updatePrompt: RequestHandler = asyncHandler(async (request, response) => {
  const prompt = await aiService.updatePrompt(
    objectId(request.params.promptId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Prompt updated', prompt);
});

export const deletePrompt: RequestHandler = asyncHandler(async (request, response) => {
  await aiService.deletePrompt(objectId(request.params.promptId), requireUserId(request));
  sendSuccess(response, 200, 'Prompt deleted');
});

export const listAutomations: RequestHandler = asyncHandler(async (request, response) => {
  const workspaceId = queryObjectId(request.query.workspaceId);
  if (!workspaceId) throw new BadRequestError('workspaceId is required');
  const rules = await automationService.listRules(workspaceId, requireUserId(request));
  sendSuccess(response, 200, 'Automation rules retrieved', rules);
});

export const createAutomation: RequestHandler = asyncHandler(async (request, response) => {
  const rule = await automationService.createRule(requireUserId(request), request.body);
  sendSuccess(response, 201, 'Automation rule created', rule);
});

export const updateAutomation: RequestHandler = asyncHandler(async (request, response) => {
  const rule = await automationService.updateRule(
    objectId(request.params.ruleId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Automation rule updated', rule);
});

export const deleteAutomation: RequestHandler = asyncHandler(async (request, response) => {
  await automationService.deleteRule(objectId(request.params.ruleId), requireUserId(request));
  sendSuccess(response, 200, 'Automation rule deleted');
});

export const testAutomation: RequestHandler = asyncHandler(async (request, response) => {
  const execution = await automationService.testRule(
    objectId(request.params.ruleId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Automation rule tested', execution);
});
