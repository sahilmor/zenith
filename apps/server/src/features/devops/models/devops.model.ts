import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from 'mongoose';

export const gitProviders = ['github', 'gitlab', 'bitbucket', 'azure_devops', 'manual'] as const;
export const repositoryStatuses = ['active', 'archived', 'disabled'] as const;
export const pullRequestStatuses = ['draft', 'open', 'merged', 'closed'] as const;
export const reviewStatuses = ['pending', 'approved', 'changes_requested', 'commented'] as const;
export const pipelineStatuses = ['queued', 'running', 'success', 'failed', 'canceled'] as const;
export const deploymentStatuses = [
  'pending',
  'in_progress',
  'success',
  'failed',
  'rolled_back',
] as const;
export const deploymentEnvironmentTypes = [
  'development',
  'preview',
  'staging',
  'production',
] as const;

const linkedWorkItemSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['task', 'project', 'document', 'goal', 'incident'],
      required: true,
    },
    id: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: false },
);

const devOpsRepositorySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    provider: { type: String, enum: gitProviders, required: true, index: true },
    providerRepositoryId: { type: String, required: true, trim: true, maxlength: 180 },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 180 },
    fullName: { type: String, required: true, trim: true, maxlength: 260 },
    url: { type: String, required: true, trim: true, maxlength: 500 },
    defaultBranch: { type: String, default: 'main', trim: true, maxlength: 120 },
    visibility: { type: String, enum: ['private', 'public', 'internal'], default: 'private' },
    status: { type: String, enum: repositoryStatuses, default: 'active', index: true },
    language: { type: String, default: null, trim: true, maxlength: 80 },
    topics: [{ type: String, trim: true, lowercase: true, maxlength: 80 }],
    lastSyncedAt: { type: Date, default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

devOpsRepositorySchema.index(
  { workspaceId: 1, provider: 1, providerRepositoryId: 1 },
  { unique: true },
);
devOpsRepositorySchema.index({ workspaceId: 1, fullName: 1 });

const devOpsBranchSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    repositoryId: {
      type: Schema.Types.ObjectId,
      ref: 'DevOpsRepository',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 180 },
    headSha: { type: String, required: true, trim: true, maxlength: 120 },
    protected: { type: Boolean, default: false, index: true },
    lastCommitAt: { type: Date, default: null, index: true },
    linkedWorkItems: { type: [linkedWorkItemSchema], default: [] },
  },
  { timestamps: true },
);

devOpsBranchSchema.index({ repositoryId: 1, name: 1 }, { unique: true });

const devOpsCommitSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    repositoryId: {
      type: Schema.Types.ObjectId,
      ref: 'DevOpsRepository',
      required: true,
      index: true,
    },
    sha: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    authorName: { type: String, required: true, trim: true, maxlength: 160 },
    authorEmail: { type: String, default: null, trim: true, lowercase: true, maxlength: 180 },
    committedAt: { type: Date, required: true, index: true },
    branchName: { type: String, default: null, trim: true, maxlength: 180, index: true },
    additions: { type: Number, default: 0, min: 0 },
    deletions: { type: Number, default: 0, min: 0 },
    filesChanged: { type: Number, default: 0, min: 0 },
    linkedWorkItems: { type: [linkedWorkItemSchema], default: [] },
  },
  { timestamps: true },
);

devOpsCommitSchema.index({ repositoryId: 1, sha: 1 }, { unique: true });
devOpsCommitSchema.index({ workspaceId: 1, committedAt: -1 });

const devOpsPullRequestSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    repositoryId: {
      type: Schema.Types.ObjectId,
      ref: 'DevOpsRepository',
      required: true,
      index: true,
    },
    providerPullRequestId: { type: String, required: true, trim: true, maxlength: 180 },
    number: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true, maxlength: 260 },
    url: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: pullRequestStatuses, default: 'open', index: true },
    reviewStatus: { type: String, enum: reviewStatuses, default: 'pending', index: true },
    sourceBranch: { type: String, required: true, trim: true, maxlength: 180 },
    targetBranch: { type: String, required: true, trim: true, maxlength: 180 },
    authorName: { type: String, required: true, trim: true, maxlength: 160 },
    openedAt: { type: Date, required: true, index: true },
    mergedAt: { type: Date, default: null, index: true },
    closedAt: { type: Date, default: null, index: true },
    additions: { type: Number, default: 0, min: 0 },
    deletions: { type: Number, default: 0, min: 0 },
    changedFiles: { type: Number, default: 0, min: 0 },
    linkedWorkItems: { type: [linkedWorkItemSchema], default: [] },
  },
  { timestamps: true },
);

devOpsPullRequestSchema.index({ repositoryId: 1, providerPullRequestId: 1 }, { unique: true });
devOpsPullRequestSchema.index({ workspaceId: 1, status: 1, openedAt: -1 });

const devOpsPipelineRunSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    repositoryId: {
      type: Schema.Types.ObjectId,
      ref: 'DevOpsRepository',
      required: true,
      index: true,
    },
    providerPipelineId: { type: String, required: true, trim: true, maxlength: 180 },
    name: { type: String, required: true, trim: true, maxlength: 180 },
    status: { type: String, enum: pipelineStatuses, required: true, index: true },
    branchName: { type: String, default: null, trim: true, maxlength: 180, index: true },
    commitSha: { type: String, default: null, trim: true, maxlength: 120 },
    startedAt: { type: Date, required: true, index: true },
    finishedAt: { type: Date, default: null, index: true },
    durationSeconds: { type: Number, default: null, min: 0 },
    url: { type: String, default: null, trim: true, maxlength: 500 },
    testTotal: { type: Number, default: 0, min: 0 },
    testFailed: { type: Number, default: 0, min: 0 },
    artifactCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

devOpsPipelineRunSchema.index({ repositoryId: 1, providerPipelineId: 1 }, { unique: true });
devOpsPipelineRunSchema.index({ workspaceId: 1, status: 1, startedAt: -1 });

const devOpsDeploymentSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    repositoryId: {
      type: Schema.Types.ObjectId,
      ref: 'DevOpsRepository',
      required: true,
      index: true,
    },
    providerDeploymentId: { type: String, required: true, trim: true, maxlength: 180 },
    environment: { type: String, required: true, trim: true, maxlength: 120, index: true },
    environmentType: {
      type: String,
      enum: deploymentEnvironmentTypes,
      default: 'staging',
      index: true,
    },
    status: { type: String, enum: deploymentStatuses, required: true, index: true },
    commitSha: { type: String, default: null, trim: true, maxlength: 120 },
    version: { type: String, default: null, trim: true, maxlength: 120 },
    url: { type: String, default: null, trim: true, maxlength: 500 },
    deployedAt: { type: Date, required: true, index: true },
    completedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    rollbackOfDeploymentId: { type: Schema.Types.ObjectId, ref: 'DevOpsDeployment', default: null },
  },
  { timestamps: true },
);

devOpsDeploymentSchema.index({ repositoryId: 1, providerDeploymentId: 1 }, { unique: true });
devOpsDeploymentSchema.index({ workspaceId: 1, environmentType: 1, deployedAt: -1 });

export type DevOpsRepository = InferSchemaType<typeof devOpsRepositorySchema>;
export type DevOpsBranch = InferSchemaType<typeof devOpsBranchSchema>;
export type DevOpsCommit = InferSchemaType<typeof devOpsCommitSchema>;
export type DevOpsPullRequest = InferSchemaType<typeof devOpsPullRequestSchema>;
export type DevOpsPipelineRun = InferSchemaType<typeof devOpsPipelineRunSchema>;
export type DevOpsDeployment = InferSchemaType<typeof devOpsDeploymentSchema>;

export type DevOpsRepositoryDocument = HydratedDocument<DevOpsRepository>;
export type DevOpsBranchDocument = HydratedDocument<DevOpsBranch>;
export type DevOpsCommitDocument = HydratedDocument<DevOpsCommit>;
export type DevOpsPullRequestDocument = HydratedDocument<DevOpsPullRequest>;
export type DevOpsPipelineRunDocument = HydratedDocument<DevOpsPipelineRun>;
export type DevOpsDeploymentDocument = HydratedDocument<DevOpsDeployment>;

export const DevOpsRepositoryModel =
  (mongoose.models.DevOpsRepository as Model<DevOpsRepository> | undefined) ??
  model<DevOpsRepository>('DevOpsRepository', devOpsRepositorySchema);
export const DevOpsBranchModel =
  (mongoose.models.DevOpsBranch as Model<DevOpsBranch> | undefined) ??
  model<DevOpsBranch>('DevOpsBranch', devOpsBranchSchema);
export const DevOpsCommitModel =
  (mongoose.models.DevOpsCommit as Model<DevOpsCommit> | undefined) ??
  model<DevOpsCommit>('DevOpsCommit', devOpsCommitSchema);
export const DevOpsPullRequestModel =
  (mongoose.models.DevOpsPullRequest as Model<DevOpsPullRequest> | undefined) ??
  model<DevOpsPullRequest>('DevOpsPullRequest', devOpsPullRequestSchema);
export const DevOpsPipelineRunModel =
  (mongoose.models.DevOpsPipelineRun as Model<DevOpsPipelineRun> | undefined) ??
  model<DevOpsPipelineRun>('DevOpsPipelineRun', devOpsPipelineRunSchema);
export const DevOpsDeploymentModel =
  (mongoose.models.DevOpsDeployment as Model<DevOpsDeployment> | undefined) ??
  model<DevOpsDeployment>('DevOpsDeployment', devOpsDeploymentSchema);
