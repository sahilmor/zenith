import type {
  GoalSummary,
  InitiativeSummary,
  KeyResultMeasurementType,
  KeyResultSummary,
  PortfolioSummary,
  StrategicCheckInSummary,
  StrategicDashboardSummary,
  StrategicHealth,
  StrategicLinkEntityType,
  StrategicLinkSummary,
  RealtimeAction,
  RealtimeResource,
  StrategicStatus,
  WorkspaceRole,
} from '@pm/types';
import { Types } from 'mongoose';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import { realtimeService } from '../../../sockets/realtime.service.js';
import { ActivityService } from '../../activity/services/activity.service.js';
import type { ActivityEventName } from '../../activity/models/activity-event.model.js';
import { entitlementService } from '../../billing/services/entitlement.service.js';
import { BoardModel } from '../../boards/models/board.model.js';
import { notificationService } from '../../notifications/services/notification.service.js';
import { auditLogService } from '../../ops/services/audit-log.service.js';
import { ProjectModel } from '../../projects/models/project.model.js';
import { TaskModel } from '../../tasks/models/task.model.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import type { GoalDocument } from '../models/goal.model.js';
import type { InitiativeDocument } from '../models/initiative.model.js';
import type { KeyResultDocument } from '../models/key-result.model.js';
import type { PortfolioDocument } from '../models/portfolio.model.js';
import type { StrategicCheckInDocument } from '../models/strategic-check-in.model.js';
import type { StrategicLinkDocument } from '../models/strategic-link.model.js';
import {
  GoalRepository,
  InitiativeRepository,
  KeyResultRepository,
  PortfolioRepository,
  StrategicCheckInRepository,
  StrategicLinkRepository,
  StrategicStatusUpdateRepository,
  type StrategicListFilters,
} from '../repositories/strategic.repository.js';
import type {
  CreateCheckInInput,
  CreateGoalInput,
  CreateInitiativeInput,
  CreateKeyResultInput,
  CreatePortfolioInput,
  CreateStrategicLinkInput,
  UpdateGoalInput,
  UpdateInitiativeInput,
  UpdateKeyResultInput,
  UpdatePortfolioInput,
} from '../validation/strategic.validation.js';

const writeRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager']);
const checkInRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager', 'member']);
const supportedLinkTypes = new Set<StrategicLinkEntityType>([
  'goal',
  'key_result',
  'initiative',
  'portfolio',
  'project',
  'board',
  'task',
]);

export class StrategicService {
  public constructor(
    private readonly goals = new GoalRepository(),
    private readonly keyResults = new KeyResultRepository(),
    private readonly checkIns = new StrategicCheckInRepository(),
    private readonly initiatives = new InitiativeRepository(),
    private readonly portfolios = new PortfolioRepository(),
    private readonly links = new StrategicLinkRepository(),
    private readonly statusUpdates = new StrategicStatusUpdateRepository(),
    private readonly workspaces = new WorkspaceRepository(),
    private readonly activity = new ActivityService(),
  ) {}

  public async createGoal(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateGoalInput,
  ): Promise<GoalSummary> {
    await this.requireRole(workspaceId, userId, writeRoles);
    await entitlementService.requireFeature(workspaceId, 'strategic_planning');
    await entitlementService.requireWithinLimit(workspaceId, 'goals');
    const ownerId = await this.resolveOwner(workspaceId, input.ownerId, userId);
    await this.validateContributors(workspaceId, input.contributorIds ?? []);
    if (input.parentGoalId)
      await this.requireGoalInWorkspace(toObjectId(input.parentGoalId), workspaceId);
    const goal = await this.goals.create({
      ...input,
      workspaceId,
      ownerId,
      contributorIds: input.contributorIds ?? [],
      calculatedProgress: input.progressMode === 'manual' ? input.manualProgress : 0,
      createdBy: userId,
    });
    await this.recordMutation('goal', 'created', workspaceId, userId, goal.id, this.toGoal(goal));
    await this.notifyAssignee(workspaceId, ownerId, userId, 'Goal assigned', goal.title);
    return this.toGoal(goal);
  }

  public async listGoals(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    filters: Omit<StrategicListFilters, 'workspaceId'>,
  ): Promise<GoalSummary[]> {
    await this.requireMembership(workspaceId, userId);
    const goals = await this.goals.list({ ...filters, workspaceId });
    return Promise.all(goals.map((goal) => this.toGoalWithProgress(goal)));
  }

  public async getGoal(goalId: Types.ObjectId, userId: Types.ObjectId): Promise<GoalSummary> {
    const goal = await this.requireGoalAccess(goalId, userId);
    return this.toGoalWithProgress(goal);
  }

  public async updateGoal(
    goalId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdateGoalInput,
  ): Promise<GoalSummary> {
    const goal = await this.requireGoalWriteAccess(goalId, userId);
    if (input.ownerId) await this.resolveOwner(goal.workspaceId, input.ownerId, userId);
    if (input.contributorIds)
      await this.validateContributors(goal.workspaceId, input.contributorIds);
    if (input.parentGoalId) {
      if (input.parentGoalId === goal.id) throw new ConflictError('Goal cannot parent itself');
      const parentGoalId = toObjectId(input.parentGoalId);
      await this.requireGoalInWorkspace(parentGoalId, goal.workspaceId);
      await this.ensureNoGoalCycle(goal._id, parentGoalId);
    }
    const updated = await this.goals.update(goalId, input);
    if (!updated) throw new NotFoundError('Goal not found');
    await this.recalculateGoal(updated._id);
    const refreshed = await this.goals.findById(updated._id);
    if (!refreshed) throw new NotFoundError('Goal not found');
    await this.recordMutation('goal', 'updated', refreshed.workspaceId, userId, refreshed.id, {
      fields: Object.keys(input),
    });
    return this.toGoal(refreshed);
  }

  public async archiveGoal(goalId: Types.ObjectId, userId: Types.ObjectId): Promise<GoalSummary> {
    const goal = await this.requireGoalWriteAccess(goalId, userId);
    const updated = await this.goals.update(goalId, { archived: true });
    if (!updated) throw new NotFoundError('Goal not found');
    await this.recordMutation(
      'goal',
      'archived',
      goal.workspaceId,
      userId,
      goal.id,
      this.toGoal(updated),
    );
    await auditLogService.record({
      actorId: userId,
      workspaceId: goal.workspaceId,
      targetType: 'goal',
      targetId: goal.id,
      action: 'goal.archived',
    });
    return this.toGoal(updated);
  }

  public async restoreGoal(goalId: Types.ObjectId, userId: Types.ObjectId): Promise<GoalSummary> {
    const goal = await this.requireGoalWriteAccess(goalId, userId);
    const updated = await this.goals.update(goalId, { archived: false });
    if (!updated) throw new NotFoundError('Goal not found');
    await this.recordMutation(
      'goal',
      'restored',
      goal.workspaceId,
      userId,
      goal.id,
      this.toGoal(updated),
    );
    return this.toGoal(updated);
  }

  public async createKeyResult(
    goalId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateKeyResultInput,
  ): Promise<KeyResultSummary> {
    const goal = await this.requireGoalWriteAccess(goalId, userId);
    const ownerId = await this.resolveOwner(goal.workspaceId, input.ownerId, userId);
    await this.validateContributors(goal.workspaceId, input.contributorIds ?? []);
    const keyResult = await this.keyResults.create({
      ...input,
      workspaceId: goal.workspaceId,
      goalId,
      ownerId,
      contributorIds: input.contributorIds ?? [],
      progress: this.calculateManualKeyResultProgress(
        input.measurementType,
        input.startValue,
        input.currentValue,
        input.targetValue,
      ),
      createdBy: userId,
    });
    await this.recalculateGoal(goalId);
    await this.recordMutation(
      'key_result',
      'created',
      goal.workspaceId,
      userId,
      keyResult.id,
      this.toKeyResult(keyResult),
    );
    return this.toKeyResult(keyResult);
  }

  public async listKeyResults(goalId: Types.ObjectId, userId: Types.ObjectId) {
    const goal = await this.requireGoalAccess(goalId, userId);
    return Promise.all(
      (await this.keyResults.listByGoal(goal._id)).map((keyResult) =>
        this.toKeyResultWithProgress(keyResult),
      ),
    );
  }

  public async updateKeyResult(
    keyResultId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdateKeyResultInput,
  ): Promise<KeyResultSummary> {
    const keyResult = await this.requireKeyResultWriteAccess(keyResultId, userId);
    const next: UpdateKeyResultInput & { progress?: number } = { ...input };
    const measurementType = (next.measurementType ??
      keyResult.measurementType) as KeyResultMeasurementType;
    const startValue = next.startValue ?? keyResult.startValue;
    const currentValue = next.currentValue ?? keyResult.currentValue;
    const targetValue = next.targetValue ?? keyResult.targetValue;
    if (
      next.measurementType ||
      next.startValue !== undefined ||
      next.currentValue !== undefined ||
      next.targetValue !== undefined
    ) {
      next.progress = this.calculateManualKeyResultProgress(
        measurementType,
        startValue,
        currentValue,
        targetValue,
      );
    }
    const updated = await this.keyResults.update(keyResultId, next);
    if (!updated) throw new NotFoundError('Key result not found');
    await this.recalculateGoal(updated.goalId);
    await this.recordMutation(
      'key_result',
      'updated',
      updated.workspaceId,
      userId,
      updated.id,
      this.toKeyResult(updated),
    );
    return this.toKeyResultWithProgress(updated);
  }

  public async deleteKeyResult(keyResultId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    const keyResult = await this.requireKeyResultWriteAccess(keyResultId, userId);
    await this.keyResults.update(keyResultId, { archived: true });
    await this.recalculateGoal(keyResult.goalId);
    await this.recordMutation(
      'key_result',
      'deleted',
      keyResult.workspaceId,
      userId,
      keyResult.id,
      {
        keyResultId: keyResult.id,
      },
    );
  }

  public async createCheckIn(
    goalId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateCheckInInput,
  ): Promise<StrategicCheckInSummary> {
    const goal = await this.requireGoalAccess(goalId, userId);
    await this.requireRole(goal.workspaceId, userId, checkInRoles);
    if (input.keyResultId) {
      const keyResult = await this.keyResults.findById(toObjectId(input.keyResultId));
      if (!keyResult || !keyResult.goalId.equals(goalId))
        throw new NotFoundError('Key result not found');
    }
    const checkIn = await this.checkIns.create({
      ...input,
      workspaceId: goal.workspaceId,
      goalId,
      authorId: userId,
    });
    await this.statusUpdates.create({
      workspaceId: goal.workspaceId,
      entityType: 'goal',
      entityId: goalId,
      authorId: userId,
      summary: input.summary,
      status: goal.status,
      health: input.health,
      progressSnapshot: input.progress,
      blockers: input.blockers ?? null,
      nextSteps: input.nextSteps ?? null,
    });
    await this.goals.update(goalId, {
      health: input.health,
      confidence: input.confidence,
      manualProgress: goal.progressMode === 'manual' ? input.progress : goal.manualProgress,
    });
    await this.recalculateGoal(goalId);
    await this.recordMutation(
      'check_in',
      'created',
      goal.workspaceId,
      userId,
      checkIn.id,
      this.toCheckIn(checkIn),
    );
    return this.toCheckIn(checkIn);
  }

  public async listCheckIns(goalId: Types.ObjectId, userId: Types.ObjectId) {
    await this.requireGoalAccess(goalId, userId);
    return (await this.checkIns.listByGoal(goalId)).map((checkIn) => this.toCheckIn(checkIn));
  }

  public async createInitiative(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateInitiativeInput,
  ): Promise<InitiativeSummary> {
    await this.requireRole(workspaceId, userId, writeRoles);
    await entitlementService.requireFeature(workspaceId, 'strategic_planning');
    await entitlementService.requireWithinLimit(workspaceId, 'initiatives');
    const ownerId = await this.resolveOwner(workspaceId, input.ownerId, userId);
    await this.validateContributors(workspaceId, input.contributorIds ?? []);
    const initiative = await this.initiatives.create({
      ...input,
      workspaceId,
      ownerId,
      contributorIds: input.contributorIds ?? [],
      createdBy: userId,
    });
    await this.recordMutation(
      'initiative',
      'created',
      workspaceId,
      userId,
      initiative.id,
      this.toInitiative(initiative),
    );
    return this.toInitiative(initiative);
  }

  public async listInitiatives(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    filters: Omit<StrategicListFilters, 'workspaceId'>,
  ) {
    await this.requireMembership(workspaceId, userId);
    const initiatives = await this.initiatives.list({ ...filters, workspaceId });
    return Promise.all(initiatives.map((initiative) => this.toInitiativeWithProgress(initiative)));
  }

  public async getInitiative(initiativeId: Types.ObjectId, userId: Types.ObjectId) {
    const initiative = await this.requireInitiativeAccess(initiativeId, userId);
    return this.toInitiativeWithProgress(initiative);
  }

  public async updateInitiative(
    initiativeId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdateInitiativeInput,
  ) {
    const initiative = await this.requireInitiativeWriteAccess(initiativeId, userId);
    if (input.ownerId) await this.resolveOwner(initiative.workspaceId, input.ownerId, userId);
    if (input.contributorIds)
      await this.validateContributors(initiative.workspaceId, input.contributorIds);
    const updated = await this.initiatives.update(initiativeId, input);
    if (!updated) throw new NotFoundError('Initiative not found');
    await this.recalculateInitiative(updated._id);
    await this.recordMutation(
      'initiative',
      'updated',
      updated.workspaceId,
      userId,
      updated.id,
      this.toInitiative(updated),
    );
    return this.toInitiativeWithProgress(updated);
  }

  public async archiveInitiative(initiativeId: Types.ObjectId, userId: Types.ObjectId) {
    const initiative = await this.requireInitiativeWriteAccess(initiativeId, userId);
    const updated = await this.initiatives.update(initiativeId, { archived: true });
    if (!updated) throw new NotFoundError('Initiative not found');
    await auditLogService.record({
      actorId: userId,
      workspaceId: initiative.workspaceId,
      targetType: 'initiative',
      targetId: initiative.id,
      action: 'initiative.archived',
    });
    await this.recordMutation(
      'initiative',
      'archived',
      initiative.workspaceId,
      userId,
      initiative.id,
      this.toInitiative(updated),
    );
    return this.toInitiative(updated);
  }

  public async restoreInitiative(initiativeId: Types.ObjectId, userId: Types.ObjectId) {
    const initiative = await this.requireInitiativeWriteAccess(initiativeId, userId);
    const updated = await this.initiatives.update(initiativeId, { archived: false });
    if (!updated) throw new NotFoundError('Initiative not found');
    await this.recordMutation(
      'initiative',
      'restored',
      initiative.workspaceId,
      userId,
      initiative.id,
      this.toInitiative(updated),
    );
    return this.toInitiative(updated);
  }

  public async createPortfolio(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreatePortfolioInput,
  ): Promise<PortfolioSummary> {
    await this.requireRole(workspaceId, userId, writeRoles);
    await entitlementService.requireFeature(workspaceId, 'strategic_planning');
    await entitlementService.requireWithinLimit(workspaceId, 'portfolios');
    const ownerId = await this.resolveOwner(workspaceId, input.ownerId, userId);
    await this.validateContributors(workspaceId, input.contributorIds ?? []);
    const portfolio = await this.portfolios.create({
      ...input,
      workspaceId,
      ownerId,
      contributorIds: input.contributorIds ?? [],
      createdBy: userId,
    });
    await this.recordMutation(
      'portfolio',
      'created',
      workspaceId,
      userId,
      portfolio.id,
      this.toPortfolio(portfolio),
    );
    return this.toPortfolio(portfolio);
  }

  public async listPortfolios(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    filters: Omit<StrategicListFilters, 'workspaceId'>,
  ) {
    await this.requireMembership(workspaceId, userId);
    const portfolios = await this.portfolios.list({ ...filters, workspaceId });
    return Promise.all(portfolios.map((portfolio) => this.toPortfolioWithProgress(portfolio)));
  }

  public async getPortfolio(portfolioId: Types.ObjectId, userId: Types.ObjectId) {
    const portfolio = await this.requirePortfolioAccess(portfolioId, userId);
    return this.toPortfolioWithProgress(portfolio);
  }

  public async updatePortfolio(
    portfolioId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdatePortfolioInput,
  ) {
    const portfolio = await this.requirePortfolioWriteAccess(portfolioId, userId);
    if (input.ownerId) await this.resolveOwner(portfolio.workspaceId, input.ownerId, userId);
    if (input.contributorIds)
      await this.validateContributors(portfolio.workspaceId, input.contributorIds);
    const updated = await this.portfolios.update(portfolioId, input);
    if (!updated) throw new NotFoundError('Portfolio not found');
    await this.recalculatePortfolio(updated._id);
    await this.recordMutation(
      'portfolio',
      'updated',
      updated.workspaceId,
      userId,
      updated.id,
      this.toPortfolio(updated),
    );
    return this.toPortfolioWithProgress(updated);
  }

  public async archivePortfolio(portfolioId: Types.ObjectId, userId: Types.ObjectId) {
    const portfolio = await this.requirePortfolioWriteAccess(portfolioId, userId);
    const updated = await this.portfolios.update(portfolioId, { archived: true });
    if (!updated) throw new NotFoundError('Portfolio not found');
    await this.recordMutation(
      'portfolio',
      'archived',
      portfolio.workspaceId,
      userId,
      portfolio.id,
      this.toPortfolio(updated),
    );
    return this.toPortfolio(updated);
  }

  public async restorePortfolio(portfolioId: Types.ObjectId, userId: Types.ObjectId) {
    const portfolio = await this.requirePortfolioWriteAccess(portfolioId, userId);
    const updated = await this.portfolios.update(portfolioId, { archived: false });
    if (!updated) throw new NotFoundError('Portfolio not found');
    await this.recordMutation(
      'portfolio',
      'restored',
      portfolio.workspaceId,
      userId,
      portfolio.id,
      this.toPortfolio(updated),
    );
    return this.toPortfolio(updated);
  }

  public async createLink(
    input: CreateStrategicLinkInput,
    userId: Types.ObjectId,
  ): Promise<StrategicLinkSummary> {
    const workspaceId = toObjectId(input.workspaceId);
    const sourceId = toObjectId(input.sourceId);
    const targetId = toObjectId(input.targetId);
    await this.requireRole(workspaceId, userId, writeRoles);
    await entitlementService.requireFeature(workspaceId, 'strategic_planning');
    await this.requireEntityInWorkspace(input.sourceType, sourceId, workspaceId);
    await this.requireEntityInWorkspace(input.targetType, targetId, workspaceId);
    const duplicate = await this.links.findDuplicate({
      workspaceId,
      sourceType: input.sourceType,
      sourceId,
      targetType: input.targetType,
      targetId,
      relationshipType: input.relationshipType,
    });
    if (duplicate) throw new ConflictError('Strategic link already exists');
    try {
      const link = await this.links.create({
        ...input,
        workspaceId,
        sourceId,
        targetId,
        createdBy: userId,
      });
      await this.recalculateLinkedEntity(link);
      await this.recordMutation(
        'strategic_link',
        'created',
        workspaceId,
        userId,
        link.id,
        this.toLink(link),
      );
      return this.toLink(link);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        throw new ConflictError('Strategic link already exists');
      }
      throw error;
    }
  }

  public async deleteLink(linkId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    const link = await this.links.findById(linkId);
    if (!link) throw new NotFoundError('Strategic link not found');
    await this.requireRole(link.workspaceId, userId, writeRoles);
    await this.links.delete(linkId);
    await this.recalculateLinkedEntity(link);
    await this.recordMutation('strategic_link', 'deleted', link.workspaceId, userId, link.id, {
      linkId: link.id,
    });
  }

  public async listLinks(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
    await this.requireMembership(workspaceId, userId);
    return (await this.links.listByWorkspace(workspaceId)).map((link) => this.toLink(link));
  }

  public async dashboard(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<StrategicDashboardSummary> {
    await this.requireMembership(workspaceId, userId);
    await entitlementService.requireFeature(workspaceId, 'strategic_planning');
    const [
      goals,
      keyResults,
      goalsByStatus,
      goalsByHealth,
      initiativesByHealth,
      portfoliosByHealth,
    ] = await Promise.all([
      this.goals.list({ workspaceId, archived: false }),
      this.keyResults.listByWorkspace(workspaceId),
      this.goals.countByField(workspaceId, 'status'),
      this.goals.countByField(workspaceId, 'health'),
      this.initiatives.countByHealth(workspaceId),
      this.portfolios.countByHealth(workspaceId),
    ]);
    const summaries = await Promise.all(goals.map((goal) => this.toGoalWithProgress(goal)));
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return {
      workspaceId: workspaceId.toString(),
      generatedAt: new Date().toISOString(),
      goalsByStatus: goalsByStatus.map(toBucket),
      goalsByHealth: goalsByHealth.map(toBucket),
      initiativesByHealth: initiativesByHealth.map(toBucket),
      portfoliosByHealth: portfoliosByHealth.map(toBucket),
      atRiskGoals: summaries
        .filter((goal) => goal.health === 'at_risk' || goal.health === 'off_track')
        .slice(0, 10),
      upcomingTargets: summaries
        .filter((goal) => {
          const target = goal.targetDate ? new Date(goal.targetDate) : null;
          return target && target >= now && target <= nextMonth;
        })
        .slice(0, 10),
      averageGoalProgress: average(summaries.map((goal) => goal.calculatedProgress)),
      keyResultAverageProgress: average(keyResults.map((keyResult) => keyResult.progress)),
      strategicRisks: summaries
        .filter((goal) => goal.health === 'off_track' || goal.confidence < 35)
        .map((goal) => ({
          id: `goal-${goal.id}`,
          entityType: 'goal' as const,
          entityId: goal.id,
          severity: goal.health === 'off_track' ? ('high' as const) : ('medium' as const),
          source: 'deterministic' as const,
          reason:
            goal.health === 'off_track'
              ? 'Goal health is marked off track.'
              : 'Goal confidence is below 35%.',
        })),
    };
  }

  private async recalculateLinkedEntity(link: StrategicLinkDocument): Promise<void> {
    if (link.sourceType === 'goal') await this.recalculateGoal(link.sourceId);
    if (link.sourceType === 'key_result') {
      const keyResult = await this.keyResults.findById(link.sourceId);
      if (keyResult) {
        await this.recalculateKeyResult(keyResult);
        await this.recalculateGoal(keyResult.goalId);
      }
    }
    if (link.sourceType === 'initiative') await this.recalculateInitiative(link.sourceId);
    if (link.sourceType === 'portfolio') await this.recalculatePortfolio(link.sourceId);
  }

  private async recalculateKeyResult(keyResult: KeyResultDocument): Promise<number> {
    if (keyResult.measurementType === 'task_completion') {
      const links = await this.links.listForSource(
        keyResult.workspaceId,
        'key_result',
        keyResult._id,
      );
      const taskIds = links
        .filter((link) => link.targetType === 'task')
        .map((link) => link.targetId);
      if (taskIds.length === 0) return keyResult.progress;
      const [total, done] = await Promise.all([
        TaskModel.countDocuments({ _id: { $in: taskIds }, archived: false }).exec(),
        TaskModel.countDocuments({ _id: { $in: taskIds }, archived: false, status: 'done' }).exec(),
      ]);
      const progress = total === 0 ? 0 : clamp((done / total) * 100);
      await this.keyResults.update(keyResult._id, {
        progress,
        currentValue: done,
        targetValue: total,
      });
      return progress;
    }
    if (keyResult.measurementType === 'project_progress') {
      const links = await this.links.listForSource(
        keyResult.workspaceId,
        'key_result',
        keyResult._id,
      );
      const projectIds = links
        .filter((link) => link.targetType === 'project')
        .map((link) => link.targetId);
      const progress = await this.averageProjectProgress(projectIds);
      await this.keyResults.update(keyResult._id, {
        progress,
        currentValue: progress,
        targetValue: 100,
      });
      return progress;
    }
    return keyResult.progress;
  }

  private async recalculateGoal(goalId: Types.ObjectId): Promise<number> {
    const goal = await this.goals.findById(goalId);
    if (!goal) return 0;
    const [keyResults, childGoals, links] = await Promise.all([
      this.keyResults.listByGoal(goalId),
      this.goals.listChildren(goalId),
      this.links.listForSource(goal.workspaceId, 'goal', goalId),
    ]);
    const values: { progress: number; weight: number }[] = [];
    for (const keyResult of keyResults) {
      values.push({ progress: await this.recalculateKeyResult(keyResult), weight: 1 });
    }
    for (const child of childGoals) {
      values.push({ progress: await this.recalculateGoal(child._id), weight: 1 });
    }
    const projectLinks = links.filter((link) => link.targetType === 'project');
    for (const link of projectLinks) {
      values.push({
        progress: await this.projectProgress(link.targetId),
        weight: link.weight || 1,
      });
    }
    const progress =
      goal.progressMode === 'manual' && values.length === 0
        ? goal.manualProgress
        : weightedAverage(values);
    await this.goals.update(goalId, { calculatedProgress: progress });
    return progress;
  }

  private async recalculateInitiative(initiativeId: Types.ObjectId): Promise<number> {
    const initiative = await this.initiatives.findById(initiativeId);
    if (!initiative) return 0;
    const links = await this.links.listForSource(
      initiative.workspaceId,
      'initiative',
      initiativeId,
    );
    const values = await Promise.all(
      links
        .filter((link) => link.targetType === 'project' || link.targetType === 'goal')
        .map(async (link) => ({
          progress:
            link.targetType === 'project'
              ? await this.projectProgress(link.targetId)
              : await this.recalculateGoal(link.targetId),
          weight: link.weight || 1,
        })),
    );
    const progress =
      initiative.progressMode === 'manual' && values.length === 0
        ? initiative.progress
        : weightedAverage(values);
    await this.initiatives.update(initiativeId, { progress });
    return progress;
  }

  private async recalculatePortfolio(portfolioId: Types.ObjectId): Promise<number> {
    const portfolio = await this.portfolios.findById(portfolioId);
    if (!portfolio) return 0;
    const links = await this.links.listForSource(portfolio.workspaceId, 'portfolio', portfolioId);
    const values = await Promise.all(
      links
        .filter((link) => link.targetType === 'project' || link.targetType === 'initiative')
        .map(async (link) => ({
          progress:
            link.targetType === 'project'
              ? await this.projectProgress(link.targetId)
              : await this.recalculateInitiative(link.targetId),
          weight: link.weight || 1,
        })),
    );
    const progress = weightedAverage(values);
    await this.portfolios.update(portfolioId, { progress });
    return progress;
  }

  private async averageProjectProgress(projectIds: Types.ObjectId[]): Promise<number> {
    if (projectIds.length === 0) return 0;
    return average(
      await Promise.all(projectIds.map((projectId) => this.projectProgress(projectId))),
    );
  }

  private async projectProgress(projectId: Types.ObjectId): Promise<number> {
    const [total, done] = await Promise.all([
      TaskModel.countDocuments({ projectId, archived: false }).exec(),
      TaskModel.countDocuments({ projectId, archived: false, status: 'done' }).exec(),
    ]);
    return total === 0 ? 0 : clamp((done / total) * 100);
  }

  private calculateManualKeyResultProgress(
    measurementType: KeyResultMeasurementType,
    startValue: number,
    currentValue: number,
    targetValue: number,
  ): number {
    if (measurementType === 'boolean') return currentValue >= targetValue ? 100 : 0;
    const denominator = targetValue - startValue;
    if (denominator === 0) throw new ConflictError('Target value must differ from start value');
    return clamp(((currentValue - startValue) / denominator) * 100);
  }

  private async requireEntityInWorkspace(
    type: StrategicLinkEntityType,
    id: Types.ObjectId,
    workspaceId: Types.ObjectId,
  ): Promise<void> {
    if (!supportedLinkTypes.has(type))
      throw new ConflictError(`${type} links are not supported yet`);
    if (type === 'goal') {
      await this.requireGoalInWorkspace(id, workspaceId);
      return;
    }
    if (type === 'key_result') {
      const keyResult = await this.keyResults.findById(id);
      if (!keyResult || !keyResult.workspaceId.equals(workspaceId))
        throw new NotFoundError('Key result not found');
      return;
    }
    if (type === 'initiative') {
      const initiative = await this.initiatives.findById(id);
      if (!initiative || !initiative.workspaceId.equals(workspaceId))
        throw new NotFoundError('Initiative not found');
      return;
    }
    if (type === 'portfolio') {
      const portfolio = await this.portfolios.findById(id);
      if (!portfolio || !portfolio.workspaceId.equals(workspaceId))
        throw new NotFoundError('Portfolio not found');
      return;
    }
    if (type === 'project') {
      const project = await ProjectModel.findById(id).exec();
      if (!project || !project.workspaceId.equals(workspaceId))
        throw new NotFoundError('Project not found');
      return;
    }
    if (type === 'board') {
      const board = await BoardModel.findById(id).exec();
      if (!board || !board.workspaceId.equals(workspaceId))
        throw new NotFoundError('Board not found');
      return;
    }
    const task = await TaskModel.findById(id).exec();
    if (!task || !task.workspaceId.equals(workspaceId)) throw new NotFoundError('Task not found');
  }

  private async ensureNoGoalCycle(
    goalId: Types.ObjectId,
    parentGoalId: Types.ObjectId,
  ): Promise<void> {
    let current: Types.ObjectId | null = parentGoalId;
    const visited = new Set<string>();
    for (let depth = 0; current && depth < 20; depth += 1) {
      if (current.equals(goalId)) throw new ConflictError('Goal hierarchy cycle detected');
      const key = current.toString();
      if (visited.has(key)) throw new ConflictError('Goal hierarchy cycle detected');
      visited.add(key);
      const parent = await this.goals.findById(current);
      current = parent?.parentGoalId ?? null;
    }
    if (current) throw new ConflictError('Goal hierarchy is too deep');
  }

  private async requireGoalInWorkspace(goalId: Types.ObjectId, workspaceId: Types.ObjectId) {
    const goal = await this.goals.findById(goalId);
    if (!goal || !goal.workspaceId.equals(workspaceId)) throw new NotFoundError('Goal not found');
    return goal;
  }

  private async requireGoalAccess(goalId: Types.ObjectId, userId: Types.ObjectId) {
    const goal = await this.goals.findById(goalId);
    if (!goal) throw new NotFoundError('Goal not found');
    await this.requireMembership(goal.workspaceId, userId);
    return goal;
  }

  private async requireGoalWriteAccess(goalId: Types.ObjectId, userId: Types.ObjectId) {
    const goal = await this.requireGoalAccess(goalId, userId);
    await this.requireRole(goal.workspaceId, userId, writeRoles);
    return goal;
  }

  private async requireKeyResultWriteAccess(keyResultId: Types.ObjectId, userId: Types.ObjectId) {
    const keyResult = await this.keyResults.findById(keyResultId);
    if (!keyResult) throw new NotFoundError('Key result not found');
    await this.requireRole(keyResult.workspaceId, userId, writeRoles);
    return keyResult;
  }

  private async requireInitiativeAccess(initiativeId: Types.ObjectId, userId: Types.ObjectId) {
    const initiative = await this.initiatives.findById(initiativeId);
    if (!initiative) throw new NotFoundError('Initiative not found');
    await this.requireMembership(initiative.workspaceId, userId);
    return initiative;
  }

  private async requireInitiativeWriteAccess(initiativeId: Types.ObjectId, userId: Types.ObjectId) {
    const initiative = await this.requireInitiativeAccess(initiativeId, userId);
    await this.requireRole(initiative.workspaceId, userId, writeRoles);
    return initiative;
  }

  private async requirePortfolioAccess(portfolioId: Types.ObjectId, userId: Types.ObjectId) {
    const portfolio = await this.portfolios.findById(portfolioId);
    if (!portfolio) throw new NotFoundError('Portfolio not found');
    await this.requireMembership(portfolio.workspaceId, userId);
    return portfolio;
  }

  private async requirePortfolioWriteAccess(portfolioId: Types.ObjectId, userId: Types.ObjectId) {
    const portfolio = await this.requirePortfolioAccess(portfolioId, userId);
    await this.requireRole(portfolio.workspaceId, userId, writeRoles);
    return portfolio;
  }

  private async requireMembership(
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

  private async requireRole(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    roles: ReadonlySet<WorkspaceRole>,
  ): Promise<void> {
    const role = await this.requireMembership(workspaceId, userId);
    if (!roles.has(role)) throw new ForbiddenError('Strategic planning access denied');
  }

  private async resolveOwner(
    workspaceId: Types.ObjectId,
    ownerId: string | undefined,
    fallback: Types.ObjectId,
  ): Promise<Types.ObjectId> {
    const resolved = ownerId ? toObjectId(ownerId) : fallback;
    await this.requireActiveMember(workspaceId, resolved);
    return resolved;
  }

  private async validateContributors(workspaceId: Types.ObjectId, contributorIds: string[]) {
    await Promise.all(
      contributorIds.map((id) => this.requireActiveMember(workspaceId, toObjectId(id))),
    );
  }

  private async requireActiveMember(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
    const membership = await this.workspaces.findMembership(workspaceId, userId);
    if (!membership || membership.status !== 'active')
      throw new ForbiddenError('Owner and contributors must be active workspace members');
  }

  private async notifyAssignee(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    actorId: Types.ObjectId,
    title: string,
    entityName: string,
  ) {
    await notificationService.create({
      userId,
      workspaceId,
      actorId,
      type: 'system_announcement',
      title,
      message: `${entityName} needs your attention.`,
      metadata: { domain: 'strategic_planning' },
    });
  }

  private async recordMutation(
    resource: RealtimeResource,
    action: RealtimeAction,
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    entityId: string,
    data: unknown,
  ) {
    await this.activity.record({
      workspaceId,
      actorId,
      event: `${resource}.${action}` as ActivityEventName,
      metadata: { entityId },
    });
    realtimeService.emitMutation({
      resource,
      action,
      workspaceId: workspaceId.toString(),
      actorId: actorId.toString(),
      data,
    });
  }

  private async toGoalWithProgress(goal: GoalDocument): Promise<GoalSummary> {
    await this.recalculateGoal(goal._id);
    const refreshed = await this.goals.findById(goal._id);
    return this.toGoal(refreshed ?? goal);
  }

  private async toKeyResultWithProgress(keyResult: KeyResultDocument): Promise<KeyResultSummary> {
    await this.recalculateKeyResult(keyResult);
    const refreshed = await this.keyResults.findById(keyResult._id);
    return this.toKeyResult(refreshed ?? keyResult);
  }

  private async toInitiativeWithProgress(
    initiative: InitiativeDocument,
  ): Promise<InitiativeSummary> {
    await this.recalculateInitiative(initiative._id);
    const refreshed = await this.initiatives.findById(initiative._id);
    return this.toInitiative(refreshed ?? initiative);
  }

  private async toPortfolioWithProgress(portfolio: PortfolioDocument): Promise<PortfolioSummary> {
    await this.recalculatePortfolio(portfolio._id);
    const refreshed = await this.portfolios.findById(portfolio._id);
    return this.toPortfolio(refreshed ?? portfolio);
  }

  private toGoal(goal: GoalDocument): GoalSummary {
    return {
      id: goal.id,
      workspaceId: goal.workspaceId.toString(),
      title: goal.title,
      description: goal.description ?? null,
      type: goal.type as GoalSummary['type'],
      status: goal.status as StrategicStatus,
      health: goal.health as StrategicHealth,
      ownerId: goal.ownerId.toString(),
      contributorIds: goal.contributorIds.map(String),
      parentGoalId: goal.parentGoalId?.toString() ?? null,
      startDate: goal.startDate?.toISOString() ?? null,
      targetDate: goal.targetDate?.toISOString() ?? null,
      progressMode: goal.progressMode as GoalSummary['progressMode'],
      manualProgress: goal.manualProgress,
      calculatedProgress: goal.calculatedProgress,
      confidence: goal.confidence,
      archived: goal.archived,
      createdBy: goal.createdBy.toString(),
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }

  private toKeyResult(keyResult: KeyResultDocument): KeyResultSummary {
    return {
      id: keyResult.id,
      workspaceId: keyResult.workspaceId.toString(),
      goalId: keyResult.goalId.toString(),
      title: keyResult.title,
      description: keyResult.description ?? null,
      ownerId: keyResult.ownerId.toString(),
      contributorIds: keyResult.contributorIds.map(String),
      measurementType: keyResult.measurementType as KeyResultMeasurementType,
      unit: keyResult.unit ?? null,
      startValue: keyResult.startValue,
      currentValue: keyResult.currentValue,
      targetValue: keyResult.targetValue,
      progress: keyResult.progress,
      status: keyResult.status as StrategicStatus,
      health: keyResult.health as StrategicHealth,
      confidence: keyResult.confidence,
      startDate: keyResult.startDate?.toISOString() ?? null,
      targetDate: keyResult.targetDate?.toISOString() ?? null,
      archived: keyResult.archived,
      createdBy: keyResult.createdBy.toString(),
      createdAt: keyResult.createdAt.toISOString(),
      updatedAt: keyResult.updatedAt.toISOString(),
    };
  }

  private toCheckIn(checkIn: StrategicCheckInDocument): StrategicCheckInSummary {
    return {
      id: checkIn.id,
      workspaceId: checkIn.workspaceId.toString(),
      goalId: checkIn.goalId.toString(),
      keyResultId: checkIn.keyResultId?.toString() ?? null,
      authorId: checkIn.authorId.toString(),
      progress: checkIn.progress,
      health: checkIn.health as StrategicHealth,
      confidence: checkIn.confidence,
      summary: checkIn.summary,
      blockers: checkIn.blockers ?? null,
      nextSteps: checkIn.nextSteps ?? null,
      createdAt: checkIn.createdAt.toISOString(),
    };
  }

  private toInitiative(initiative: InitiativeDocument): InitiativeSummary {
    return {
      id: initiative.id,
      workspaceId: initiative.workspaceId.toString(),
      name: initiative.name,
      description: initiative.description ?? null,
      status: initiative.status as StrategicStatus,
      health: initiative.health as StrategicHealth,
      priority: initiative.priority as InitiativeSummary['priority'],
      ownerId: initiative.ownerId.toString(),
      contributorIds: initiative.contributorIds.map(String),
      startDate: initiative.startDate?.toISOString() ?? null,
      targetDate: initiative.targetDate?.toISOString() ?? null,
      progressMode: initiative.progressMode as InitiativeSummary['progressMode'],
      progress: initiative.progress,
      archived: initiative.archived,
      createdBy: initiative.createdBy.toString(),
      createdAt: initiative.createdAt.toISOString(),
      updatedAt: initiative.updatedAt.toISOString(),
    };
  }

  private toPortfolio(portfolio: PortfolioDocument): PortfolioSummary {
    return {
      id: portfolio.id,
      workspaceId: portfolio.workspaceId.toString(),
      name: portfolio.name,
      description: portfolio.description ?? null,
      ownerId: portfolio.ownerId.toString(),
      contributorIds: portfolio.contributorIds.map(String),
      status: portfolio.status as StrategicStatus,
      health: portfolio.health as StrategicHealth,
      progress: portfolio.progress,
      archived: portfolio.archived,
      createdBy: portfolio.createdBy.toString(),
      createdAt: portfolio.createdAt.toISOString(),
      updatedAt: portfolio.updatedAt.toISOString(),
    };
  }

  private toLink(link: StrategicLinkDocument): StrategicLinkSummary {
    return {
      id: link.id,
      workspaceId: link.workspaceId.toString(),
      sourceType: link.sourceType as StrategicLinkEntityType,
      sourceId: link.sourceId.toString(),
      targetType: link.targetType as StrategicLinkEntityType,
      targetId: link.targetId.toString(),
      relationshipType: link.relationshipType as StrategicLinkSummary['relationshipType'],
      weight: link.weight,
      createdBy: link.createdBy.toString(),
      createdAt: link.createdAt.toISOString(),
    };
  }
}

export const strategicService = new StrategicService();

const toObjectId = (value: string): Types.ObjectId => new Types.ObjectId(value);

const clamp = (value: number): number => Math.min(100, Math.max(0, Math.round(value * 100) / 100));

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return clamp(values.reduce((total, value) => total + value, 0) / values.length);
};

const weightedAverage = (values: { progress: number; weight: number }[]): number => {
  const totalWeight = values.reduce((total, value) => total + value.weight, 0);
  if (values.length === 0 || totalWeight <= 0) return 0;
  return clamp(
    values.reduce((total, value) => total + value.progress * value.weight, 0) / totalWeight,
  );
};

const toBucket = (bucket: { _id: string; count: number }) => ({
  key: bucket._id || 'none',
  label: (bucket._id || 'None').replace(/[_-]/g, ' '),
  value: bucket.count,
});
