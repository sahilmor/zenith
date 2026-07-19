import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  createAllocation,
  createAvailability,
  createTimeEntry,
  getResourceForecast,
  getResourceSummary,
  getTimer,
  getTimesheet,
  heartbeatTimer,
  listResourceProfiles,
  listTimeEntries,
  startTimer,
  stopTimer,
  upsertResourceProfile,
} from '../controllers/resource.controller.js';
import {
  createAllocationSchema,
  createAvailabilitySchema,
  createTimeEntrySchema,
  heartbeatTimerSchema,
  resourceRangeSchema,
  startTimerSchema,
  stopTimerSchema,
  upsertResourceProfileSchema,
  workspaceResourceParamsSchema,
} from '../validation/resource.validation.js';

export const resourceRouter = Router();

resourceRouter.use(verifyToken);

resourceRouter.get(
  '/workspaces/:workspaceId/resources',
  validate(resourceRangeSchema),
  getResourceSummary,
);
resourceRouter.get(
  '/workspaces/:workspaceId/resources/forecast',
  validate(resourceRangeSchema),
  getResourceForecast,
);
resourceRouter.get(
  '/workspaces/:workspaceId/resources/profiles',
  validate(workspaceResourceParamsSchema),
  listResourceProfiles,
);
resourceRouter.put(
  '/workspaces/:workspaceId/resources/profiles/:userId',
  validate(upsertResourceProfileSchema),
  upsertResourceProfile,
);
resourceRouter.get(
  '/workspaces/:workspaceId/time/timer',
  validate(workspaceResourceParamsSchema),
  getTimer,
);
resourceRouter.post(
  '/workspaces/:workspaceId/time/timer/start',
  validate(startTimerSchema),
  startTimer,
);
resourceRouter.post(
  '/workspaces/:workspaceId/time/timer/heartbeat',
  validate(heartbeatTimerSchema),
  heartbeatTimer,
);
resourceRouter.post(
  '/workspaces/:workspaceId/time/timer/stop',
  validate(stopTimerSchema),
  stopTimer,
);
resourceRouter.get(
  '/workspaces/:workspaceId/time/entries',
  validate(resourceRangeSchema),
  listTimeEntries,
);
resourceRouter.post(
  '/workspaces/:workspaceId/time/entries',
  validate(createTimeEntrySchema),
  createTimeEntry,
);
resourceRouter.get(
  '/workspaces/:workspaceId/time/timesheet',
  validate(resourceRangeSchema),
  getTimesheet,
);
resourceRouter.post(
  '/workspaces/:workspaceId/resources/allocations',
  validate(createAllocationSchema),
  createAllocation,
);
resourceRouter.post(
  '/workspaces/:workspaceId/resources/availability',
  validate(createAvailabilitySchema),
  createAvailability,
);
