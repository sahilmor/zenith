import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const isoDate = z.string().datetime();
const optionalObjectId = objectId.optional().nullable();
const timezone = z.string().trim().min(1).max(80).default('UTC');

const rangeQuery = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  userId: objectId.optional(),
  projectId: objectId.optional(),
  taskId: objectId.optional(),
});

const skillSchema = z.object({
  name: z.string().trim().min(1).max(80),
  level: z.coerce.number().int().min(1).max(5).default(3),
});

const workingHoursSchema = z
  .object({
    monday: z.coerce.number().int().min(0).max(1440).optional(),
    tuesday: z.coerce.number().int().min(0).max(1440).optional(),
    wednesday: z.coerce.number().int().min(0).max(1440).optional(),
    thursday: z.coerce.number().int().min(0).max(1440).optional(),
    friday: z.coerce.number().int().min(0).max(1440).optional(),
    saturday: z.coerce.number().int().min(0).max(1440).optional(),
    sunday: z.coerce.number().int().min(0).max(1440).optional(),
  })
  .optional();

export const workspaceResourceParamsSchema = z.object({
  params: z.object({ workspaceId: objectId }),
});

export const resourceRangeSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  query: rangeQuery,
});

export const upsertResourceProfileSchema = z.object({
  params: z.object({ workspaceId: objectId, userId: objectId }),
  body: z.object({
    title: z.string().trim().max(120).optional().nullable(),
    department: z.string().trim().max(120).optional().nullable(),
    location: z.string().trim().max(120).optional().nullable(),
    timezone: timezone.optional(),
    weeklyCapacityMinutes: z.coerce.number().int().min(0).max(10080).optional(),
    costRate: z.coerce.number().min(0).optional().nullable(),
    billRate: z.coerce.number().min(0).optional().nullable(),
    skills: z.array(skillSchema).max(50).optional(),
    competencies: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
    workingHours: workingHoursSchema,
    active: z.boolean().optional(),
  }),
});

export const startTimerSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    projectId: optionalObjectId,
    taskId: optionalObjectId,
    description: z.string().trim().max(1000).optional().nullable(),
    billable: z.boolean().default(false),
    startedAt: isoDate.optional(),
    timezone,
  }),
});

export const heartbeatTimerSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    idle: z.boolean().default(false),
  }),
});

export const stopTimerSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    endedAt: isoDate.optional(),
    description: z.string().trim().max(1000).optional().nullable(),
  }),
});

export const createTimeEntrySchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z
    .object({
      projectId: optionalObjectId,
      taskId: optionalObjectId,
      userId: objectId.optional(),
      description: z.string().trim().max(1000).optional().nullable(),
      minutes: z.coerce.number().int().min(1).max(1440).optional(),
      billable: z.boolean().default(false),
      startedAt: isoDate,
      endedAt: isoDate,
      timezone,
    })
    .refine((value) => value.minutes ?? new Date(value.endedAt) > new Date(value.startedAt), {
      message: 'endedAt must be after startedAt',
      path: ['endedAt'],
    }),
});

export const createAllocationSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z
    .object({
      projectId: objectId,
      userId: objectId,
      role: z.string().trim().max(120).optional().nullable(),
      allocationPercent: z.coerce.number().min(0).max(200),
      startDate: isoDate,
      endDate: isoDate,
      status: z.enum(['planned', 'active', 'completed', 'canceled']).default('planned'),
      notes: z.string().trim().max(1000).optional().nullable(),
    })
    .refine((value) => new Date(value.endDate) >= new Date(value.startDate), {
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    }),
});

export const createAvailabilitySchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z
    .object({
      userId: objectId,
      type: z.enum(['holiday', 'leave', 'training', 'focus', 'unavailable']),
      title: z.string().trim().min(2).max(160),
      startDate: isoDate,
      endDate: isoDate,
      minutesUnavailable: z.coerce.number().int().min(0).optional().nullable(),
      notes: z.string().trim().max(1000).optional().nullable(),
    })
    .refine((value) => new Date(value.endDate) >= new Date(value.startDate), {
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    }),
});

export type UpsertResourceProfileInput = z.infer<typeof upsertResourceProfileSchema>['body'];
export type StartTimerInput = z.infer<typeof startTimerSchema>['body'];
export type HeartbeatTimerInput = z.infer<typeof heartbeatTimerSchema>['body'];
export type StopTimerInput = z.infer<typeof stopTimerSchema>['body'];
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>['body'];
export type CreateAllocationInput = z.infer<typeof createAllocationSchema>['body'];
export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>['body'];
