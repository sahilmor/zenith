import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  archiveRepository,
  createRepository,
  getDevOpsSummary,
  listBranches,
  listRepositories,
  upsertBranch,
  upsertCommit,
  upsertDeployment,
  upsertPipelineRun,
  upsertPullRequest,
} from '../controllers/devops.controller.js';
import {
  createRepositorySchema,
  devOpsRangeSchema,
  repositoryParamsSchema,
  upsertBranchSchema,
  upsertCommitSchema,
  upsertDeploymentSchema,
  upsertPipelineRunSchema,
  upsertPullRequestSchema,
  workspaceDevOpsParamsSchema,
} from '../validation/devops.validation.js';

export const devOpsRouter = Router();

devOpsRouter.use(verifyToken);

devOpsRouter.get('/workspaces/:workspaceId/devops', validate(devOpsRangeSchema), getDevOpsSummary);
devOpsRouter.get(
  '/workspaces/:workspaceId/devops/repositories',
  validate(workspaceDevOpsParamsSchema),
  listRepositories,
);
devOpsRouter.post(
  '/workspaces/:workspaceId/devops/repositories',
  validate(createRepositorySchema),
  createRepository,
);
devOpsRouter.delete(
  '/devops/repositories/:repositoryId',
  validate(repositoryParamsSchema),
  archiveRepository,
);
devOpsRouter.get(
  '/devops/repositories/:repositoryId/branches',
  validate(repositoryParamsSchema),
  listBranches,
);
devOpsRouter.put(
  '/devops/repositories/:repositoryId/branches',
  validate(upsertBranchSchema),
  upsertBranch,
);
devOpsRouter.put(
  '/devops/repositories/:repositoryId/commits',
  validate(upsertCommitSchema),
  upsertCommit,
);
devOpsRouter.put(
  '/devops/repositories/:repositoryId/pull-requests',
  validate(upsertPullRequestSchema),
  upsertPullRequest,
);
devOpsRouter.put(
  '/devops/repositories/:repositoryId/pipelines',
  validate(upsertPipelineRunSchema),
  upsertPipelineRun,
);
devOpsRouter.put(
  '/devops/repositories/:repositoryId/deployments',
  validate(upsertDeploymentSchema),
  upsertDeployment,
);
