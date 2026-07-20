import type { FilterQuery, Types } from 'mongoose';
import {
  DevOpsBranchModel,
  DevOpsCommitModel,
  DevOpsDeploymentModel,
  DevOpsPipelineRunModel,
  DevOpsPullRequestModel,
  DevOpsRepositoryModel,
  type DevOpsBranchDocument,
  type DevOpsCommitDocument,
  type DevOpsDeploymentDocument,
  type DevOpsPipelineRunDocument,
  type DevOpsPullRequestDocument,
  type DevOpsRepositoryDocument,
} from '../models/devops.model.js';

export interface DevOpsRange {
  readonly from?: Date;
  readonly to?: Date;
}

export class DevOpsRepository {
  public async createRepository(input: {
    workspaceId: Types.ObjectId;
    projectId?: Types.ObjectId | null;
    provider: DevOpsRepositoryDocument['provider'];
    providerRepositoryId: string;
    name: string;
    fullName: string;
    url: string;
    defaultBranch: string;
    visibility: DevOpsRepositoryDocument['visibility'];
    language?: string | null;
    topics: string[];
    createdBy: Types.ObjectId;
  }): Promise<DevOpsRepositoryDocument> {
    return DevOpsRepositoryModel.create(input) as Promise<DevOpsRepositoryDocument>;
  }

  public async listRepositories(workspaceId: Types.ObjectId): Promise<DevOpsRepositoryDocument[]> {
    return DevOpsRepositoryModel.find({ workspaceId, status: { $ne: 'archived' } })
      .sort({ fullName: 1 })
      .exec() as Promise<DevOpsRepositoryDocument[]>;
  }

  public async findRepositoryById(
    repositoryId: Types.ObjectId,
  ): Promise<DevOpsRepositoryDocument | null> {
    return DevOpsRepositoryModel.findById(
      repositoryId,
    ).exec() as Promise<DevOpsRepositoryDocument | null>;
  }

  public async findRepositoryByProvider(input: {
    workspaceId: Types.ObjectId;
    provider: string;
    providerRepositoryId: string;
  }): Promise<DevOpsRepositoryDocument | null> {
    return DevOpsRepositoryModel.findOne(input).exec() as Promise<DevOpsRepositoryDocument | null>;
  }

  public async archiveRepository(
    repositoryId: Types.ObjectId,
    updatedBy: Types.ObjectId,
  ): Promise<DevOpsRepositoryDocument | null> {
    return DevOpsRepositoryModel.findByIdAndUpdate(
      repositoryId,
      { $set: { status: 'archived', updatedBy } },
      { new: true },
    ).exec() as Promise<DevOpsRepositoryDocument | null>;
  }

  public async upsertBranch(input: {
    workspaceId: Types.ObjectId;
    repositoryId: Types.ObjectId;
    name: string;
    headSha: string;
    protected: boolean;
    lastCommitAt?: Date | null;
    linkedWorkItems: { type: string; id: Types.ObjectId }[];
  }): Promise<DevOpsBranchDocument> {
    return DevOpsBranchModel.findOneAndUpdate(
      { repositoryId: input.repositoryId, name: input.name },
      { $set: input },
      { upsert: true, new: true },
    ).exec() as Promise<DevOpsBranchDocument>;
  }

  public async listBranches(repositoryId: Types.ObjectId): Promise<DevOpsBranchDocument[]> {
    return DevOpsBranchModel.find({ repositoryId })
      .sort({ protected: -1, name: 1 })
      .exec() as Promise<DevOpsBranchDocument[]>;
  }

  public async upsertCommit(input: {
    workspaceId: Types.ObjectId;
    repositoryId: Types.ObjectId;
    sha: string;
    message: string;
    authorName: string;
    authorEmail?: string | null;
    committedAt: Date;
    branchName?: string | null;
    additions: number;
    deletions: number;
    filesChanged: number;
    linkedWorkItems: { type: string; id: Types.ObjectId }[];
  }): Promise<DevOpsCommitDocument> {
    return DevOpsCommitModel.findOneAndUpdate(
      { repositoryId: input.repositoryId, sha: input.sha },
      { $set: input },
      { upsert: true, new: true },
    ).exec() as Promise<DevOpsCommitDocument>;
  }

  public async listCommits(input: {
    workspaceId: Types.ObjectId;
    repositoryId?: Types.ObjectId;
    range?: DevOpsRange;
  }): Promise<DevOpsCommitDocument[]> {
    const query: FilterQuery<DevOpsCommitDocument> = { workspaceId: input.workspaceId };
    if (input.repositoryId) query.repositoryId = input.repositoryId;
    if (input.range?.from || input.range?.to) {
      query.committedAt = {
        ...(input.range.from ? { $gte: input.range.from } : {}),
        ...(input.range.to ? { $lte: input.range.to } : {}),
      };
    }
    return DevOpsCommitModel.find(query).sort({ committedAt: -1 }).limit(500).exec() as Promise<
      DevOpsCommitDocument[]
    >;
  }

  public async upsertPullRequest(input: {
    workspaceId: Types.ObjectId;
    repositoryId: Types.ObjectId;
    providerPullRequestId: string;
    number: number;
    title: string;
    url: string;
    status: DevOpsPullRequestDocument['status'];
    reviewStatus: DevOpsPullRequestDocument['reviewStatus'];
    sourceBranch: string;
    targetBranch: string;
    authorName: string;
    openedAt: Date;
    mergedAt?: Date | null;
    closedAt?: Date | null;
    additions: number;
    deletions: number;
    changedFiles: number;
    linkedWorkItems: { type: string; id: Types.ObjectId }[];
  }): Promise<DevOpsPullRequestDocument> {
    return DevOpsPullRequestModel.findOneAndUpdate(
      { repositoryId: input.repositoryId, providerPullRequestId: input.providerPullRequestId },
      { $set: input },
      { upsert: true, new: true },
    ).exec() as Promise<DevOpsPullRequestDocument>;
  }

  public async listPullRequests(input: {
    workspaceId: Types.ObjectId;
    repositoryId?: Types.ObjectId;
    status?: string;
    range?: DevOpsRange;
  }): Promise<DevOpsPullRequestDocument[]> {
    const query: FilterQuery<DevOpsPullRequestDocument> = { workspaceId: input.workspaceId };
    if (input.repositoryId) query.repositoryId = input.repositoryId;
    if (input.status) query.status = input.status;
    if (input.range?.from || input.range?.to) {
      query.openedAt = {
        ...(input.range.from ? { $gte: input.range.from } : {}),
        ...(input.range.to ? { $lte: input.range.to } : {}),
      };
    }
    return DevOpsPullRequestModel.find(query).sort({ openedAt: -1 }).limit(500).exec() as Promise<
      DevOpsPullRequestDocument[]
    >;
  }

  public async upsertPipelineRun(input: {
    workspaceId: Types.ObjectId;
    repositoryId: Types.ObjectId;
    providerPipelineId: string;
    name: string;
    status: DevOpsPipelineRunDocument['status'];
    branchName?: string | null;
    commitSha?: string | null;
    startedAt: Date;
    finishedAt?: Date | null;
    durationSeconds?: number | null;
    url?: string | null;
    testTotal: number;
    testFailed: number;
    artifactCount: number;
  }): Promise<DevOpsPipelineRunDocument> {
    return DevOpsPipelineRunModel.findOneAndUpdate(
      { repositoryId: input.repositoryId, providerPipelineId: input.providerPipelineId },
      { $set: input },
      { upsert: true, new: true },
    ).exec() as Promise<DevOpsPipelineRunDocument>;
  }

  public async listPipelineRuns(input: {
    workspaceId: Types.ObjectId;
    repositoryId?: Types.ObjectId;
    range?: DevOpsRange;
  }): Promise<DevOpsPipelineRunDocument[]> {
    const query: FilterQuery<DevOpsPipelineRunDocument> = { workspaceId: input.workspaceId };
    if (input.repositoryId) query.repositoryId = input.repositoryId;
    if (input.range?.from || input.range?.to) {
      query.startedAt = {
        ...(input.range.from ? { $gte: input.range.from } : {}),
        ...(input.range.to ? { $lte: input.range.to } : {}),
      };
    }
    return DevOpsPipelineRunModel.find(query).sort({ startedAt: -1 }).limit(500).exec() as Promise<
      DevOpsPipelineRunDocument[]
    >;
  }

  public async upsertDeployment(input: {
    workspaceId: Types.ObjectId;
    repositoryId: Types.ObjectId;
    providerDeploymentId: string;
    environment: string;
    environmentType: DevOpsDeploymentDocument['environmentType'];
    status: DevOpsDeploymentDocument['status'];
    commitSha?: string | null;
    version?: string | null;
    url?: string | null;
    deployedAt: Date;
    completedAt?: Date | null;
    approvedBy?: Types.ObjectId | null;
    rollbackOfDeploymentId?: Types.ObjectId | null;
  }): Promise<DevOpsDeploymentDocument> {
    return DevOpsDeploymentModel.findOneAndUpdate(
      { repositoryId: input.repositoryId, providerDeploymentId: input.providerDeploymentId },
      { $set: input },
      { upsert: true, new: true },
    ).exec() as Promise<DevOpsDeploymentDocument>;
  }

  public async listDeployments(input: {
    workspaceId: Types.ObjectId;
    repositoryId?: Types.ObjectId;
    range?: DevOpsRange;
  }): Promise<DevOpsDeploymentDocument[]> {
    const query: FilterQuery<DevOpsDeploymentDocument> = { workspaceId: input.workspaceId };
    if (input.repositoryId) query.repositoryId = input.repositoryId;
    if (input.range?.from || input.range?.to) {
      query.deployedAt = {
        ...(input.range.from ? { $gte: input.range.from } : {}),
        ...(input.range.to ? { $lte: input.range.to } : {}),
      };
    }
    return DevOpsDeploymentModel.find(query).sort({ deployedAt: -1 }).limit(500).exec() as Promise<
      DevOpsDeploymentDocument[]
    >;
  }
}
