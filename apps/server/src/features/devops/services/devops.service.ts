import type {
  DeploymentStatus,
  DevOpsBranchSummary,
  DevOpsCommitSummary,
  DevOpsDeploymentSummary,
  DevOpsLinkedWorkItem,
  DevOpsPipelineRunSummary,
  DevOpsPullRequestSummary,
  DevOpsRepositorySummary,
  DevOpsWorkspaceSummary,
  EngineeringMetricsSummary,
  PipelineStatus,
  PullRequestStatus,
  RealtimeAction,
  RealtimeResource,
  ResourceDeliveryRisk,
  WorkspaceRole,
} from '@pm/types';
import { Types } from 'mongoose';
import type { ActivityEventName } from '../../activity/models/activity-event.model.js';
import { ActivityService } from '../../activity/services/activity.service.js';
import { entitlementService } from '../../billing/services/entitlement.service.js';
import { auditLogService } from '../../ops/services/audit-log.service.js';
import { ProjectRepository } from '../../projects/repositories/project.repository.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import { realtimeService } from '../../../sockets/realtime.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import type {
  DevOpsBranchDocument,
  DevOpsCommitDocument,
  DevOpsDeploymentDocument,
  DevOpsPipelineRunDocument,
  DevOpsPullRequestDocument,
  DevOpsRepositoryDocument,
} from '../models/devops.model.js';
import { DevOpsRepository } from '../repositories/devops.repository.js';
import type {
  CreateRepositoryInput,
  UpsertBranchInput,
  UpsertCommitInput,
  UpsertDeploymentInput,
  UpsertPipelineRunInput,
  UpsertPullRequestInput,
} from '../validation/devops.validation.js';

const devOpsWriteRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager']);
const hourMs = 60 * 60 * 1000;

const average = (values: number[]): number =>
  values.length > 0
    ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100
    : 0;

const percent = (part: number, total: number): number =>
  total > 0 ? Math.round((part / total) * 10000) / 100 : 0;

export class DevOpsService {
  public constructor(
    private readonly devops = new DevOpsRepository(),
    private readonly workspaces = new WorkspaceRepository(),
    private readonly projects = new ProjectRepository(),
    private readonly activity = new ActivityService(),
  ) {}

  public async createRepository(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: CreateRepositoryInput,
  ): Promise<DevOpsRepositorySummary> {
    await this.requireDevOpsWrite(workspaceId, actorId);
    await entitlementService.requireFeature(workspaceId, 'devops');
    await entitlementService.requireWithinLimit(workspaceId, 'devOpsRepositories');
    if (input.projectId) await this.ensureProject(workspaceId, this.toObjectId(input.projectId));
    const duplicate = await this.devops.findRepositoryByProvider({
      workspaceId,
      provider: input.provider,
      providerRepositoryId: input.providerRepositoryId,
    });
    if (duplicate) throw new ConflictError('Repository connection already exists');
    const repository = await this.devops.createRepository({
      workspaceId,
      projectId: input.projectId ? this.toObjectId(input.projectId) : null,
      provider: input.provider,
      providerRepositoryId: input.providerRepositoryId,
      name: input.name,
      fullName: input.fullName,
      url: input.url,
      defaultBranch: input.defaultBranch,
      visibility: input.visibility,
      language: input.language ?? null,
      topics: input.topics,
      createdBy: actorId,
    });
    await this.record(workspaceId, actorId, 'devops.repository.connected', {
      repositoryId: repository.id,
      provider: repository.provider,
      fullName: repository.fullName,
    });
    await auditLogService.record({
      actorId,
      workspaceId,
      targetType: 'devops_repository',
      targetId: repository.id,
      action: 'devops.repository.connected',
      metadata: { provider: repository.provider, fullName: repository.fullName },
    });
    const summary = this.toRepositorySummary(repository);
    this.emit('devops_repository', 'created', workspaceId, actorId, summary, repository.projectId);
    return summary;
  }

  public async listRepositories(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
  ): Promise<DevOpsRepositorySummary[]> {
    await this.requireDevOpsRead(workspaceId, actorId);
    const repositories = await this.devops.listRepositories(workspaceId);
    return repositories.map((repository) => this.toRepositorySummary(repository));
  }

  public async archiveRepository(
    repositoryId: Types.ObjectId,
    actorId: Types.ObjectId,
  ): Promise<DevOpsRepositorySummary> {
    const repository = await this.requireRepository(repositoryId, actorId, true);
    const archived = await this.devops.archiveRepository(repositoryId, actorId);
    if (!archived) throw new NotFoundError('Repository not found');
    await this.record(repository.workspaceId, actorId, 'devops.repository.archived', {
      repositoryId: repository.id,
    });
    const summary = this.toRepositorySummary(archived);
    this.emit(
      'devops_repository',
      'archived',
      repository.workspaceId,
      actorId,
      summary,
      repository.projectId,
    );
    return summary;
  }

  public async upsertBranch(
    repositoryId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: UpsertBranchInput,
  ): Promise<DevOpsBranchSummary> {
    const repository = await this.requireRepository(repositoryId, actorId, true);
    const branch = await this.devops.upsertBranch({
      workspaceId: repository.workspaceId,
      repositoryId,
      name: input.name,
      headSha: input.headSha,
      protected: input.protected,
      lastCommitAt: input.lastCommitAt ? new Date(input.lastCommitAt) : null,
      linkedWorkItems: input.linkedWorkItems.map((item) => ({
        type: item.type,
        id: this.toObjectId(item.id),
      })),
    });
    const summary = this.toBranchSummary(branch);
    this.emit(
      'devops_branch',
      'updated',
      repository.workspaceId,
      actorId,
      summary,
      repository.projectId,
    );
    return summary;
  }

  public async listBranches(
    repositoryId: Types.ObjectId,
    actorId: Types.ObjectId,
  ): Promise<DevOpsBranchSummary[]> {
    const repository = await this.requireRepository(repositoryId, actorId, false);
    const branches = await this.devops.listBranches(repository._id);
    return branches.map((branch) => this.toBranchSummary(branch));
  }

  public async upsertCommit(
    repositoryId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: UpsertCommitInput,
  ): Promise<DevOpsCommitSummary> {
    const repository = await this.requireRepository(repositoryId, actorId, true);
    const commit = await this.devops.upsertCommit({
      workspaceId: repository.workspaceId,
      repositoryId,
      sha: input.sha,
      message: input.message,
      authorName: input.authorName,
      authorEmail: input.authorEmail ?? null,
      committedAt: new Date(input.committedAt),
      branchName: input.branchName ?? null,
      additions: input.additions,
      deletions: input.deletions,
      filesChanged: input.filesChanged,
      linkedWorkItems: input.linkedWorkItems.map((item) => ({
        type: item.type,
        id: this.toObjectId(item.id),
      })),
    });
    await this.record(repository.workspaceId, actorId, 'devops.commit.ingested', {
      repositoryId: repository.id,
      sha: commit.sha,
    });
    const summary = this.toCommitSummary(commit);
    this.emit(
      'devops_commit',
      'created',
      repository.workspaceId,
      actorId,
      summary,
      repository.projectId,
    );
    return summary;
  }

  public async upsertPullRequest(
    repositoryId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: UpsertPullRequestInput,
  ): Promise<DevOpsPullRequestSummary> {
    const repository = await this.requireRepository(repositoryId, actorId, true);
    const pullRequest = await this.devops.upsertPullRequest({
      workspaceId: repository.workspaceId,
      repositoryId,
      providerPullRequestId: input.providerPullRequestId,
      number: input.number,
      title: input.title,
      url: input.url,
      status: input.status,
      reviewStatus: input.reviewStatus,
      sourceBranch: input.sourceBranch,
      targetBranch: input.targetBranch,
      authorName: input.authorName,
      openedAt: new Date(input.openedAt),
      mergedAt: input.mergedAt ? new Date(input.mergedAt) : null,
      closedAt: input.closedAt ? new Date(input.closedAt) : null,
      additions: input.additions,
      deletions: input.deletions,
      changedFiles: input.changedFiles,
      linkedWorkItems: input.linkedWorkItems.map((item) => ({
        type: item.type,
        id: this.toObjectId(item.id),
      })),
    });
    await this.record(repository.workspaceId, actorId, 'devops.pull_request.updated', {
      repositoryId: repository.id,
      pullRequestId: pullRequest.id,
      status: pullRequest.status,
    });
    const summary = this.toPullRequestSummary(pullRequest);
    this.emit(
      'devops_pull_request',
      'updated',
      repository.workspaceId,
      actorId,
      summary,
      repository.projectId,
    );
    return summary;
  }

  public async upsertPipelineRun(
    repositoryId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: UpsertPipelineRunInput,
  ): Promise<DevOpsPipelineRunSummary> {
    const repository = await this.requireRepository(repositoryId, actorId, true);
    await entitlementService.requireWithinLimit(repository.workspaceId, 'devOpsPipelines');
    const pipeline = await this.devops.upsertPipelineRun({
      workspaceId: repository.workspaceId,
      repositoryId,
      providerPipelineId: input.providerPipelineId,
      name: input.name,
      status: input.status,
      branchName: input.branchName ?? null,
      commitSha: input.commitSha ?? null,
      startedAt: new Date(input.startedAt),
      finishedAt: input.finishedAt ? new Date(input.finishedAt) : null,
      durationSeconds: input.durationSeconds ?? null,
      url: input.url ?? null,
      testTotal: input.testTotal,
      testFailed: input.testFailed,
      artifactCount: input.artifactCount,
    });
    const summary = this.toPipelineSummary(pipeline);
    this.emit(
      'devops_pipeline',
      'updated',
      repository.workspaceId,
      actorId,
      summary,
      repository.projectId,
    );
    return summary;
  }

  public async upsertDeployment(
    repositoryId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: UpsertDeploymentInput,
  ): Promise<DevOpsDeploymentSummary> {
    const repository = await this.requireRepository(repositoryId, actorId, true);
    await entitlementService.requireWithinLimit(repository.workspaceId, 'devOpsDeployments');
    if (input.approvedBy)
      await this.requireWorkspaceMembership(
        repository.workspaceId,
        this.toObjectId(input.approvedBy),
      );
    const deployment = await this.devops.upsertDeployment({
      workspaceId: repository.workspaceId,
      repositoryId,
      providerDeploymentId: input.providerDeploymentId,
      environment: input.environment,
      environmentType: input.environmentType,
      status: input.status,
      commitSha: input.commitSha ?? null,
      version: input.version ?? null,
      url: input.url ?? null,
      deployedAt: new Date(input.deployedAt),
      completedAt: input.completedAt ? new Date(input.completedAt) : null,
      approvedBy: input.approvedBy ? this.toObjectId(input.approvedBy) : null,
      rollbackOfDeploymentId: input.rollbackOfDeploymentId
        ? this.toObjectId(input.rollbackOfDeploymentId)
        : null,
    });
    await this.record(repository.workspaceId, actorId, 'devops.deployment.updated', {
      repositoryId: repository.id,
      deploymentId: deployment.id,
      environment: deployment.environment,
      status: deployment.status,
    });
    const summary = this.toDeploymentSummary(deployment);
    this.emit(
      'devops_deployment',
      'updated',
      repository.workspaceId,
      actorId,
      summary,
      repository.projectId,
    );
    return summary;
  }

  public async getWorkspaceSummary(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    range: { from?: Date; to?: Date; repositoryId?: Types.ObjectId; status?: string },
  ): Promise<DevOpsWorkspaceSummary> {
    await this.requireDevOpsRead(workspaceId, actorId);
    const repositories = await this.devops.listRepositories(workspaceId);
    const repositoryId = range.repositoryId;
    if (repositoryId) {
      const selected = repositories.find((repository) => repository._id.equals(repositoryId));
      if (!selected) throw new NotFoundError('Repository not found');
    }
    const queryScope = { workspaceId, ...(repositoryId ? { repositoryId } : {}), range };
    const [pullRequests, pipelines, deployments] = await Promise.all([
      this.devops.listPullRequests({
        ...queryScope,
        ...(range.status ? { status: range.status } : {}),
      }),
      this.devops.listPipelineRuns(queryScope),
      this.devops.listDeployments(queryScope),
    ]);
    return {
      metrics: this.calculateMetrics(repositories, pullRequests, pipelines, deployments),
      repositories: repositories.map((repository) => this.toRepositorySummary(repository)),
      recentPullRequests: pullRequests.slice(0, 10).map((item) => this.toPullRequestSummary(item)),
      recentPipelineRuns: pipelines.slice(0, 10).map((item) => this.toPipelineSummary(item)),
      recentDeployments: deployments.slice(0, 10).map((item) => this.toDeploymentSummary(item)),
    };
  }

  private calculateMetrics(
    repositories: DevOpsRepositoryDocument[],
    pullRequests: DevOpsPullRequestDocument[],
    pipelines: DevOpsPipelineRunDocument[],
    deployments: DevOpsDeploymentDocument[],
  ): EngineeringMetricsSummary {
    const merged = pullRequests.filter((item) => item.status === 'merged');
    const successfulDeployments = deployments.filter((item) => item.status === 'success');
    const failedDeployments = deployments.filter((item) => item.status === 'failed');
    const failedPipelines = pipelines.filter((item) => item.status === 'failed');
    const finishedPipelines = pipelines.filter(
      (item) => item.status !== 'queued' && item.status !== 'running',
    );
    const leadTimes = merged.flatMap((item) =>
      item.mergedAt ? [(item.mergedAt.getTime() - item.openedAt.getTime()) / hourMs] : [],
    );
    const reviewLatencies = pullRequests
      .filter((item) => item.reviewStatus !== 'pending')
      .map((item) => {
        const reviewedAt = item.mergedAt ?? item.closedAt ?? item.updatedAt;
        return (reviewedAt.getTime() - item.openedAt.getTime()) / hourMs;
      });
    const mttrValues = failedDeployments
      .map((failed) => {
        const recovery = successfulDeployments.find(
          (candidate) => candidate.deployedAt > failed.deployedAt,
        );
        return recovery
          ? (recovery.deployedAt.getTime() - failed.deployedAt.getTime()) / hourMs
          : null;
      })
      .filter((value): value is number => value !== null);
    const changeFailureRate = percent(failedDeployments.length, deployments.length);
    const buildSuccessRate = percent(
      finishedPipelines.filter((item) => item.status === 'success').length,
      finishedPipelines.length,
    );
    const releaseRisk = this.releaseRisk(
      changeFailureRate,
      failedPipelines.length,
      pullRequests.length,
    );
    return {
      repositoryCount: repositories.length,
      openPullRequestCount: pullRequests.filter(
        (item) => item.status === 'open' || item.status === 'draft',
      ).length,
      mergedPullRequestCount: merged.length,
      deploymentFrequency: successfulDeployments.length,
      leadTimeHours: average(leadTimes),
      changeFailureRate,
      mttrHours: average(mttrValues),
      averageReviewLatencyHours: average(reviewLatencies),
      buildSuccessRate,
      releaseRisk,
      insights: [
        `${repositories.length} repositories connected.`,
        `${Math.round(buildSuccessRate)}% build success rate across completed pipelines.`,
        `${Math.round(changeFailureRate)}% deployment change failure rate.`,
      ],
    };
  }

  private releaseRisk(
    changeFailureRate: number,
    failedPipelineCount: number,
    pullRequestCount: number,
  ): ResourceDeliveryRisk {
    if (changeFailureRate >= 25 || failedPipelineCount >= 5) return 'high';
    if (changeFailureRate >= 10 || failedPipelineCount >= 2 || pullRequestCount > 20)
      return 'medium';
    return 'low';
  }

  private async requireRepository(
    repositoryId: Types.ObjectId,
    actorId: Types.ObjectId,
    write: boolean,
  ): Promise<DevOpsRepositoryDocument> {
    const repository = await this.devops.findRepositoryById(repositoryId);
    if (!repository || repository.status === 'archived')
      throw new NotFoundError('Repository not found');
    if (write) await this.requireDevOpsWrite(repository.workspaceId, actorId);
    else await this.requireDevOpsRead(repository.workspaceId, actorId);
    return repository;
  }

  private async requireDevOpsRead(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
  ): Promise<WorkspaceRole> {
    await entitlementService.requireFeature(workspaceId, 'devops');
    return this.requireWorkspaceMembership(workspaceId, actorId);
  }

  private async requireDevOpsWrite(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
  ): Promise<void> {
    const role = await this.requireWorkspaceMembership(workspaceId, actorId);
    if (!devOpsWriteRoles.has(role))
      throw new ForbiddenError('Engineering manager access required');
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

  private async ensureProject(
    workspaceId: Types.ObjectId,
    projectId: Types.ObjectId,
  ): Promise<void> {
    const project = await this.projects.findById(projectId);
    if (!project || !project.workspaceId.equals(workspaceId))
      throw new NotFoundError('Project not found');
  }

  private async record(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    event: ActivityEventName,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.activity.record({ workspaceId, actorId, event, metadata });
  }

  private emit<TData>(
    resource: RealtimeResource,
    action: RealtimeAction,
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    data: TData,
    projectId?: Types.ObjectId | null,
  ): void {
    realtimeService.emitMutation({
      resource,
      action,
      workspaceId: workspaceId.toString(),
      ...(projectId ? { projectId: projectId.toString() } : {}),
      actorId: actorId.toString(),
      data,
    });
  }

  private toObjectId(value: string): Types.ObjectId {
    return new Types.ObjectId(value);
  }

  private links(items: { type: string; id: Types.ObjectId }[]): DevOpsLinkedWorkItem[] {
    return items.map((item) => ({
      type: item.type as DevOpsLinkedWorkItem['type'],
      id: item.id.toString(),
    }));
  }

  private toRepositorySummary(repository: DevOpsRepositoryDocument): DevOpsRepositorySummary {
    return {
      id: repository.id,
      workspaceId: repository.workspaceId.toString(),
      projectId: repository.projectId?.toString() ?? null,
      provider: repository.provider,
      providerRepositoryId: repository.providerRepositoryId,
      name: repository.name,
      fullName: repository.fullName,
      url: repository.url,
      defaultBranch: repository.defaultBranch,
      visibility: repository.visibility,
      status: repository.status,
      language: repository.language ?? null,
      topics: repository.topics,
      lastSyncedAt: repository.lastSyncedAt?.toISOString() ?? null,
      createdBy: repository.createdBy.toString(),
      createdAt: repository.createdAt.toISOString(),
      updatedAt: repository.updatedAt.toISOString(),
    };
  }

  private toBranchSummary(branch: DevOpsBranchDocument): DevOpsBranchSummary {
    return {
      id: branch.id,
      workspaceId: branch.workspaceId.toString(),
      repositoryId: branch.repositoryId.toString(),
      name: branch.name,
      headSha: branch.headSha,
      protected: branch.protected,
      lastCommitAt: branch.lastCommitAt?.toISOString() ?? null,
      linkedWorkItems: this.links(branch.linkedWorkItems),
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString(),
    };
  }

  private toCommitSummary(commit: DevOpsCommitDocument): DevOpsCommitSummary {
    return {
      id: commit.id,
      workspaceId: commit.workspaceId.toString(),
      repositoryId: commit.repositoryId.toString(),
      sha: commit.sha,
      message: commit.message,
      authorName: commit.authorName,
      authorEmail: commit.authorEmail ?? null,
      committedAt: commit.committedAt.toISOString(),
      branchName: commit.branchName ?? null,
      additions: commit.additions,
      deletions: commit.deletions,
      filesChanged: commit.filesChanged,
      linkedWorkItems: this.links(commit.linkedWorkItems),
    };
  }

  private toPullRequestSummary(pullRequest: DevOpsPullRequestDocument): DevOpsPullRequestSummary {
    return {
      id: pullRequest.id,
      workspaceId: pullRequest.workspaceId.toString(),
      repositoryId: pullRequest.repositoryId.toString(),
      providerPullRequestId: pullRequest.providerPullRequestId,
      number: pullRequest.number,
      title: pullRequest.title,
      url: pullRequest.url,
      status: pullRequest.status as PullRequestStatus,
      reviewStatus: pullRequest.reviewStatus,
      sourceBranch: pullRequest.sourceBranch,
      targetBranch: pullRequest.targetBranch,
      authorName: pullRequest.authorName,
      openedAt: pullRequest.openedAt.toISOString(),
      mergedAt: pullRequest.mergedAt?.toISOString() ?? null,
      closedAt: pullRequest.closedAt?.toISOString() ?? null,
      additions: pullRequest.additions,
      deletions: pullRequest.deletions,
      changedFiles: pullRequest.changedFiles,
      linkedWorkItems: this.links(pullRequest.linkedWorkItems),
    };
  }

  private toPipelineSummary(pipeline: DevOpsPipelineRunDocument): DevOpsPipelineRunSummary {
    return {
      id: pipeline.id,
      workspaceId: pipeline.workspaceId.toString(),
      repositoryId: pipeline.repositoryId.toString(),
      providerPipelineId: pipeline.providerPipelineId,
      name: pipeline.name,
      status: pipeline.status as PipelineStatus,
      branchName: pipeline.branchName ?? null,
      commitSha: pipeline.commitSha ?? null,
      startedAt: pipeline.startedAt.toISOString(),
      finishedAt: pipeline.finishedAt?.toISOString() ?? null,
      durationSeconds: pipeline.durationSeconds ?? null,
      url: pipeline.url ?? null,
      testTotal: pipeline.testTotal,
      testFailed: pipeline.testFailed,
      artifactCount: pipeline.artifactCount,
    };
  }

  private toDeploymentSummary(deployment: DevOpsDeploymentDocument): DevOpsDeploymentSummary {
    return {
      id: deployment.id,
      workspaceId: deployment.workspaceId.toString(),
      repositoryId: deployment.repositoryId.toString(),
      providerDeploymentId: deployment.providerDeploymentId,
      environment: deployment.environment,
      environmentType: deployment.environmentType,
      status: deployment.status as DeploymentStatus,
      commitSha: deployment.commitSha ?? null,
      version: deployment.version ?? null,
      url: deployment.url ?? null,
      deployedAt: deployment.deployedAt.toISOString(),
      completedAt: deployment.completedAt?.toISOString() ?? null,
      approvedBy: deployment.approvedBy?.toString() ?? null,
      rollbackOfDeploymentId: deployment.rollbackOfDeploymentId?.toString() ?? null,
    };
  }
}
