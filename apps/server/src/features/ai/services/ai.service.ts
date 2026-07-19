import type {
  AiActionResult,
  AiActionType,
  AiConversationMessage,
  AiConversationSummary,
  AiProviderId,
  AiReference,
  AiSearchResult,
  PromptSummary,
  WorkspaceRole,
} from '@pm/types';
import { Types } from 'mongoose';
import { ActivityService } from '../../activity/services/activity.service.js';
import { BoardRepository } from '../../boards/repositories/board.repository.js';
import { ProjectRepository } from '../../projects/repositories/project.repository.js';
import { searchService } from '../../search/services/search.service.js';
import { TaskService } from '../../tasks/services/task.service.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import { ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import { entitlementService } from '../../billing/services/entitlement.service.js';
import type { AiConversationDocument } from '../models/ai-conversation.model.js';
import type { PromptDocument } from '../models/prompt.model.js';
import { AiProviderRegistry } from '../providers/provider-registry.js';
import { AiConversationRepository, PromptRepository } from '../repositories/ai.repository.js';
import type {
  AiActionInput,
  AiSearchInput,
  ChatInput,
  PromptInput,
} from '../validation/ai.validation.js';

const promptWriteRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager']);

export class AiService {
  public constructor(
    private readonly conversations = new AiConversationRepository(),
    private readonly prompts = new PromptRepository(),
    private readonly workspaces = new WorkspaceRepository(),
    private readonly projects = new ProjectRepository(),
    private readonly boards = new BoardRepository(),
    private readonly tasks = new TaskService(),
    private readonly registry = new AiProviderRegistry(),
    private readonly activity = new ActivityService(),
  ) {}

  public async listConversations(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<AiConversationSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    const conversations = await this.conversations.list(workspaceId, userId);
    return conversations.map((conversation) => this.toConversationSummary(conversation));
  }

  public async chat(userId: Types.ObjectId, input: ChatInput): Promise<AiConversationSummary> {
    const workspaceId = new Types.ObjectId(input.workspaceId);
    await this.requireWorkspaceMembership(workspaceId, userId);
    await entitlementService.requireFeature(workspaceId, 'ai');
    await entitlementService.requireWithinLimit(workspaceId, 'aiRequests');
    await this.validateReferences(workspaceId, userId, input.references);
    const provider = this.registry.getProvider();
    const conversation = input.conversationId
      ? await this.requireConversation(
          new Types.ObjectId(input.conversationId),
          workspaceId,
          userId,
        )
      : await this.conversations.create({
          workspaceId,
          userId,
          title: input.message.slice(0, 80),
          provider: provider.id,
        });
    const context = await this.buildContext(workspaceId, userId, input.references);
    const messages = [
      { role: 'system' as const, content: this.systemPrompt(context) },
      ...conversation.messages.map((message) => ({
        role: message.role as 'system' | 'user' | 'assistant',
        content: message.content,
      })),
      { role: 'user' as const, content: input.message },
    ];
    const result = await provider.complete({ messages, references: input.references });
    const updated = await this.conversations.update(conversation._id, {
      provider: result.provider,
      $push: {
        messages: {
          $each: [
            { role: 'user', content: input.message, references: input.references },
            { role: 'assistant', content: result.content, references: input.references },
          ],
        },
      },
    });
    if (!updated) throw new NotFoundError('Conversation not found');
    await this.activity.record({
      workspaceId,
      actorId: userId,
      event: 'task.updated',
      metadata: { ai: true, action: 'chat', conversationId: updated.id },
    });
    return this.toConversationSummary(updated);
  }

  public async streamChat(
    userId: Types.ObjectId,
    input: ChatInput,
  ): Promise<AsyncGenerator<string>> {
    const workspaceId = new Types.ObjectId(input.workspaceId);
    await this.requireWorkspaceMembership(workspaceId, userId);
    await entitlementService.requireFeature(workspaceId, 'ai');
    await entitlementService.requireWithinLimit(workspaceId, 'aiRequests');
    await this.validateReferences(workspaceId, userId, input.references);
    const provider = this.registry.getProvider();
    const context = await this.buildContext(workspaceId, userId, input.references);
    const messages = [
      { role: 'system' as const, content: this.systemPrompt(context) },
      { role: 'user' as const, content: input.message },
    ];
    return provider.stream({ messages, references: input.references });
  }

  public async updateConversation(
    conversationId: Types.ObjectId,
    userId: Types.ObjectId,
    input: { title?: string; pinned?: boolean },
  ): Promise<AiConversationSummary> {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) throw new NotFoundError('Conversation not found');
    if (conversation.userId.toString() !== userId.toString())
      throw new ForbiddenError('Conversation access denied');
    await this.requireWorkspaceMembership(conversation.workspaceId, userId);
    const updated = await this.conversations.update(conversationId, input);
    if (!updated) throw new NotFoundError('Conversation not found');
    return this.toConversationSummary(updated);
  }

  public async runAction(userId: Types.ObjectId, input: AiActionInput): Promise<AiActionResult> {
    const workspaceId = new Types.ObjectId(input.workspaceId);
    await this.requireWorkspaceMembership(workspaceId, userId);
    await entitlementService.requireFeature(workspaceId, 'ai');
    await entitlementService.requireWithinLimit(workspaceId, 'aiRequests');
    const references = await this.referencesForInput(input);
    await this.validateReferences(workspaceId, userId, references);
    const provider = this.registry.getProvider();
    const prompt = this.actionPrompt(input.action, input.input);
    const context = await this.buildContext(workspaceId, userId, references);
    const result = await provider.complete({
      messages: [
        { role: 'system', content: this.systemPrompt(context) },
        { role: 'user', content: prompt },
      ],
      references,
    });
    return {
      action: input.action,
      content: result.content,
      suggestions: this.extractSuggestions(input.action, result.content),
      references,
    };
  }

  public async search(userId: Types.ObjectId, input: AiSearchInput): Promise<AiSearchResult> {
    const workspaceId = new Types.ObjectId(input.workspaceId);
    await this.requireWorkspaceMembership(workspaceId, userId);
    await entitlementService.requireFeature(workspaceId, 'advanced_search');
    const filters = this.parseSearch(input.query);
    const taskList = await this.tasks.listAdvancedTasks(userId, {
      workspaceId: input.workspaceId,
      page: 1,
      limit: 25,
      sort: 'updatedAt',
      direction: 'desc',
      ...filters,
    });
    const universal = await searchService.search(userId, {
      workspaceId: input.workspaceId,
      q: input.query,
      sort: 'relevance',
      page: 1,
      limit: 10,
    });
    const citations = await searchService.retrieveForAi({
      workspaceId,
      userId,
      query: input.query,
      limit: 5,
    });
    return {
      query: input.query,
      filters,
      tasks: taskList.items,
      results: universal.results,
      citations,
    };
  }

  public async listPrompts(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    projectId?: Types.ObjectId,
  ): Promise<PromptSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    const prompts = await this.prompts.list(workspaceId, projectId);
    return prompts.map((prompt) => this.toPromptSummary(prompt));
  }

  public async createPrompt(userId: Types.ObjectId, input: PromptInput): Promise<PromptSummary> {
    const workspaceId = new Types.ObjectId(input.workspaceId);
    await this.requireWorkspaceRole(workspaceId, userId, promptWriteRoles);
    const prompt = await this.prompts.create({
      workspaceId,
      projectId: input.projectId ? new Types.ObjectId(input.projectId) : null,
      scope: input.scope,
      name: input.name,
      content: input.content,
      variables: input.variables,
      createdBy: userId,
    });
    return this.toPromptSummary(prompt);
  }

  public async updatePrompt(
    promptId: Types.ObjectId,
    userId: Types.ObjectId,
    input: Partial<PromptInput>,
  ): Promise<PromptSummary> {
    const prompt = await this.prompts.findById(promptId);
    if (!prompt) throw new NotFoundError('Prompt not found');
    await this.requireWorkspaceRole(prompt.workspaceId, userId, promptWriteRoles);
    const update = {
      ...input,
      ...(input.projectId !== undefined
        ? { projectId: input.projectId ? new Types.ObjectId(input.projectId) : null }
        : {}),
      version: prompt.version + 1,
    };
    const updated = await this.prompts.update(promptId, update);
    if (!updated) throw new NotFoundError('Prompt not found');
    return this.toPromptSummary(updated);
  }

  public async deletePrompt(promptId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    const prompt = await this.prompts.findById(promptId);
    if (!prompt) throw new NotFoundError('Prompt not found');
    await this.requireWorkspaceRole(prompt.workspaceId, userId, promptWriteRoles);
    await this.prompts.delete(promptId);
  }

  private async requireConversation(
    conversationId: Types.ObjectId,
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<AiConversationDocument> {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) throw new NotFoundError('Conversation not found');
    if (
      conversation.workspaceId.toString() !== workspaceId.toString() ||
      conversation.userId.toString() !== userId.toString()
    ) {
      throw new ForbiddenError('Conversation access denied');
    }
    return conversation;
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

  private async requireWorkspaceRole(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    roles: ReadonlySet<WorkspaceRole>,
  ): Promise<void> {
    const role = await this.requireWorkspaceMembership(workspaceId, userId);
    if (!roles.has(role)) throw new ForbiddenError('AI administration access required');
  }

  private async validateReferences(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    references: AiReference[],
  ): Promise<void> {
    await Promise.all(
      references.map(async (reference) => {
        if (reference.type === 'project') {
          const project = await this.projects.findById(new Types.ObjectId(reference.id));
          if (!project || project.workspaceId.toString() !== workspaceId.toString())
            throw new ForbiddenError('Project context denied');
        }
        if (reference.type === 'board') {
          const board = await this.boards.findById(new Types.ObjectId(reference.id));
          if (!board || board.workspaceId.toString() !== workspaceId.toString())
            throw new ForbiddenError('Board context denied');
        }
        if (reference.type === 'task') {
          const task = await this.tasks.getTask(new Types.ObjectId(reference.id), userId);
          if (task.workspaceId !== workspaceId.toString())
            throw new ForbiddenError('Task context denied');
        }
      }),
    );
  }

  private async buildContext(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    references: AiReference[],
  ): Promise<string> {
    const tasks = await this.tasks.listAdvancedTasks(userId, {
      workspaceId: workspaceId.toString(),
      page: 1,
      limit: 8,
      sort: 'updatedAt',
      direction: 'desc',
      archived: false,
    });
    return [
      `Workspace: ${workspaceId.toString()}`,
      `References: ${references.map((reference) => `${reference.type}:${reference.label}`).join(', ') || 'none'}`,
      `Recent accessible tasks: ${tasks.items.map((task) => `${task.title} [${task.status}/${task.priority}]`).join('; ') || 'none'}`,
      'Do not reveal secrets, tokens, credentials, hidden metadata, or data from unauthorized workspaces.',
    ].join('\n');
  }

  private systemPrompt(context: string): string {
    return [
      'You are Zenith AI Copilot for a project management SaaS.',
      'Be concise, actionable, and grounded in the provided authorized context.',
      'When suggesting changes, explain the proposed result before action.',
      context,
    ].join('\n');
  }

  private actionPrompt(action: AiActionType, input: string): string {
    return `Run AI action "${action}" for this request. Return clear, practical output with bullets when helpful.\n\n${input}`;
  }

  private extractSuggestions(action: AiActionType, content: string): string[] {
    if (
      action === 'generate_tasks' ||
      action === 'generate_checklist' ||
      action === 'break_task_into_subtasks'
    ) {
      return content
        .split('\n')
        .map((line) => line.replace(/^[-*\d.\s]+/, '').trim())
        .filter((line) => line.length > 3)
        .slice(0, 12);
    }
    return [];
  }

  private parseSearch(query: string) {
    const normalized = query.toLowerCase();
    const filters: Record<string, string | string[] | boolean | number> = {};
    if (normalized.includes('overdue')) filters.dueTo = new Date().toISOString();
    if (normalized.includes('high priority') || normalized.includes('urgent'))
      filters.priority = normalized.includes('urgent') ? 'urgent' : 'high';
    if (normalized.includes('completed') || normalized.includes('done')) filters.status = 'done';
    if (normalized.includes('open')) filters.status = 'open';
    if (normalized.includes('archived')) filters.archived = true;
    if (normalized.includes('backend')) filters.labels = ['backend'];
    if (normalized.includes('bug') || normalized.includes('bugs')) filters.labels = ['bug'];
    if (Object.keys(filters).length === 0) filters.search = query;
    return filters;
  }

  private async referencesForInput(input: AiActionInput): Promise<AiReference[]> {
    const references: AiReference[] = [
      { type: 'workspace', id: input.workspaceId, label: 'Current workspace' },
    ];
    if (input.projectId)
      references.push({ type: 'project', id: input.projectId, label: 'Selected project' });
    if (input.boardId)
      references.push({ type: 'board', id: input.boardId, label: 'Selected board' });
    if (input.taskId) references.push({ type: 'task', id: input.taskId, label: 'Selected task' });
    return references;
  }

  private toConversationSummary(conversation: AiConversationDocument): AiConversationSummary {
    return {
      id: conversation.id,
      workspaceId: conversation.workspaceId.toString(),
      userId: conversation.userId.toString(),
      title: conversation.title,
      pinned: conversation.pinned,
      provider: conversation.provider as AiProviderId,
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role as AiConversationMessage['role'],
        content: message.content,
        references: message.references as AiReference[],
        createdAt: message.createdAt.toISOString(),
      })),
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  private toPromptSummary(prompt: PromptDocument): PromptSummary {
    return {
      id: prompt.id,
      workspaceId: prompt.workspaceId.toString(),
      projectId: prompt.projectId?.toString() ?? null,
      scope: prompt.scope as PromptSummary['scope'],
      name: prompt.name,
      content: prompt.content,
      variables: prompt.variables,
      version: prompt.version,
      createdBy: prompt.createdBy.toString(),
      createdAt: prompt.createdAt.toISOString(),
      updatedAt: prompt.updatedAt.toISOString(),
    };
  }
}
