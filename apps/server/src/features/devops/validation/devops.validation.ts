import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const isoDate = z.string().datetime();
const optionalObjectId = objectId.optional().nullable();

const rangeQuery = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  repositoryId: objectId.optional(),
  status: z.string().trim().min(1).max(80).optional(),
});

const linkedWorkItemSchema = z.object({
  type: z.enum(['task', 'project', 'document', 'goal', 'incident']),
  id: objectId,
});

export const workspaceDevOpsParamsSchema = z.object({
  params: z.object({ workspaceId: objectId }),
});

export const repositoryParamsSchema = z.object({
  params: z.object({ repositoryId: objectId }),
});

export const devOpsRangeSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  query: rangeQuery,
});

export const createRepositorySchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    projectId: optionalObjectId,
    provider: z.enum(['github', 'gitlab', 'bitbucket', 'azure_devops', 'manual']),
    providerRepositoryId: z.string().trim().min(1).max(180),
    name: z.string().trim().min(1).max(180),
    fullName: z.string().trim().min(1).max(260),
    url: z.string().url().max(500),
    defaultBranch: z.string().trim().min(1).max(120).default('main'),
    visibility: z.enum(['private', 'public', 'internal']).default('private'),
    language: z.string().trim().max(80).optional().nullable(),
    topics: z.array(z.string().trim().min(1).max(80).toLowerCase()).max(50).default([]),
  }),
});

export const upsertBranchSchema = z.object({
  params: z.object({ repositoryId: objectId }),
  body: z.object({
    name: z.string().trim().min(1).max(180),
    headSha: z.string().trim().min(6).max(120),
    protected: z.boolean().default(false),
    lastCommitAt: isoDate.optional().nullable(),
    linkedWorkItems: z.array(linkedWorkItemSchema).max(50).default([]),
  }),
});

export const upsertCommitSchema = z.object({
  params: z.object({ repositoryId: objectId }),
  body: z.object({
    sha: z.string().trim().min(6).max(120),
    message: z.string().trim().min(1).max(2000),
    authorName: z.string().trim().min(1).max(160),
    authorEmail: z.string().email().optional().nullable(),
    committedAt: isoDate,
    branchName: z.string().trim().max(180).optional().nullable(),
    additions: z.coerce.number().int().min(0).default(0),
    deletions: z.coerce.number().int().min(0).default(0),
    filesChanged: z.coerce.number().int().min(0).default(0),
    linkedWorkItems: z.array(linkedWorkItemSchema).max(50).default([]),
  }),
});

export const upsertPullRequestSchema = z.object({
  params: z.object({ repositoryId: objectId }),
  body: z.object({
    providerPullRequestId: z.string().trim().min(1).max(180),
    number: z.coerce.number().int().min(1),
    title: z.string().trim().min(1).max(260),
    url: z.string().url().max(500),
    status: z.enum(['draft', 'open', 'merged', 'closed']).default('open'),
    reviewStatus: z
      .enum(['pending', 'approved', 'changes_requested', 'commented'])
      .default('pending'),
    sourceBranch: z.string().trim().min(1).max(180),
    targetBranch: z.string().trim().min(1).max(180),
    authorName: z.string().trim().min(1).max(160),
    openedAt: isoDate,
    mergedAt: isoDate.optional().nullable(),
    closedAt: isoDate.optional().nullable(),
    additions: z.coerce.number().int().min(0).default(0),
    deletions: z.coerce.number().int().min(0).default(0),
    changedFiles: z.coerce.number().int().min(0).default(0),
    linkedWorkItems: z.array(linkedWorkItemSchema).max(50).default([]),
  }),
});

export const upsertPipelineRunSchema = z.object({
  params: z.object({ repositoryId: objectId }),
  body: z.object({
    providerPipelineId: z.string().trim().min(1).max(180),
    name: z.string().trim().min(1).max(180),
    status: z.enum(['queued', 'running', 'success', 'failed', 'canceled']),
    branchName: z.string().trim().max(180).optional().nullable(),
    commitSha: z.string().trim().max(120).optional().nullable(),
    startedAt: isoDate,
    finishedAt: isoDate.optional().nullable(),
    durationSeconds: z.coerce.number().int().min(0).optional().nullable(),
    url: z.string().url().max(500).optional().nullable(),
    testTotal: z.coerce.number().int().min(0).default(0),
    testFailed: z.coerce.number().int().min(0).default(0),
    artifactCount: z.coerce.number().int().min(0).default(0),
  }),
});

export const upsertDeploymentSchema = z.object({
  params: z.object({ repositoryId: objectId }),
  body: z.object({
    providerDeploymentId: z.string().trim().min(1).max(180),
    environment: z.string().trim().min(1).max(120),
    environmentType: z.enum(['development', 'preview', 'staging', 'production']).default('staging'),
    status: z.enum(['pending', 'in_progress', 'success', 'failed', 'rolled_back']),
    commitSha: z.string().trim().max(120).optional().nullable(),
    version: z.string().trim().max(120).optional().nullable(),
    url: z.string().url().max(500).optional().nullable(),
    deployedAt: isoDate,
    completedAt: isoDate.optional().nullable(),
    approvedBy: optionalObjectId,
    rollbackOfDeploymentId: optionalObjectId,
  }),
});

export type CreateRepositoryInput = z.infer<typeof createRepositorySchema>['body'];
export type UpsertBranchInput = z.infer<typeof upsertBranchSchema>['body'];
export type UpsertCommitInput = z.infer<typeof upsertCommitSchema>['body'];
export type UpsertPullRequestInput = z.infer<typeof upsertPullRequestSchema>['body'];
export type UpsertPipelineRunInput = z.infer<typeof upsertPipelineRunSchema>['body'];
export type UpsertDeploymentInput = z.infer<typeof upsertDeploymentSchema>['body'];
