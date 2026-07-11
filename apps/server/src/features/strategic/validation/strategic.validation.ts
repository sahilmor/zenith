import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const isoDate = z.coerce.date().optional().nullable();
const progress = z.coerce.number().min(0).max(100);

const strategicStatus = z.enum(['draft', 'active', 'at_risk', 'achieved', 'missed', 'canceled']);
const strategicHealth = z.enum(['on_track', 'at_risk', 'off_track', 'no_status']);
const progressMode = z.enum(['manual', 'automatic']);
const contributorIds = z.array(objectId).max(50).optional();

const goalBody = z.object({
  title: z.string().trim().min(2).max(180),
  description: optionalText(4000),
  type: z.enum(['objective', 'goal', 'company_goal', 'team_goal', 'personal_goal']).default('goal'),
  status: strategicStatus.default('draft'),
  health: strategicHealth.default('no_status'),
  ownerId: objectId.optional(),
  contributorIds,
  parentGoalId: objectId.optional().nullable(),
  startDate: isoDate,
  targetDate: isoDate,
  progressMode: progressMode.default('manual'),
  manualProgress: progress.default(0),
  confidence: progress.default(50),
});

export const createGoalSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: goalBody,
});

export const updateGoalSchema = z.object({
  params: z.object({ goalId: objectId }),
  body: goalBody.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  }),
});

export const goalParamsSchema = z.object({ params: z.object({ goalId: objectId }) });

export const workspaceStrategicParamsSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  query: z.object({
    search: z.string().trim().max(120).optional(),
    status: strategicStatus.optional(),
    health: strategicHealth.optional(),
    archived: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === 'true')),
  }),
});

const keyResultFields = z.object({
  title: z.string().trim().min(2).max(180),
  description: optionalText(4000),
  ownerId: objectId.optional(),
  contributorIds,
  measurementType: z
    .enum([
      'number',
      'percentage',
      'currency',
      'boolean',
      'task_completion',
      'project_progress',
      'milestone_progress',
      'custom',
    ])
    .default('number'),
  unit: optionalText(24),
  startValue: z.coerce.number().default(0),
  currentValue: z.coerce.number().default(0),
  targetValue: z.coerce.number().default(100),
  status: strategicStatus.default('active'),
  health: strategicHealth.default('no_status'),
  confidence: progress.default(50),
  startDate: isoDate,
  targetDate: isoDate,
});

const keyResultBody = keyResultFields.refine(
  (value) => value.measurementType === 'boolean' || value.targetValue !== value.startValue,
  {
    message: 'Target value must differ from start value',
    path: ['targetValue'],
  },
);

export const createKeyResultSchema = z.object({
  params: z.object({ goalId: objectId }),
  body: keyResultBody,
});

export const updateKeyResultSchema = z.object({
  params: z.object({ keyResultId: objectId }),
  body: keyResultFields.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  }),
});

export const keyResultParamsSchema = z.object({ params: z.object({ keyResultId: objectId }) });

export const createCheckInSchema = z.object({
  params: z.object({ goalId: objectId }),
  body: z.object({
    keyResultId: objectId.optional().nullable(),
    progress,
    health: strategicHealth,
    confidence: progress,
    summary: z.string().trim().min(2).max(4000),
    blockers: optionalText(2000),
    nextSteps: optionalText(2000),
  }),
});

const initiativeBody = z.object({
  name: z.string().trim().min(2).max(180),
  description: optionalText(4000),
  status: strategicStatus.default('draft'),
  health: strategicHealth.default('no_status'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  ownerId: objectId.optional(),
  contributorIds,
  startDate: isoDate,
  targetDate: isoDate,
  progressMode: progressMode.default('manual'),
  progress: progress.default(0),
});

export const createInitiativeSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: initiativeBody,
});

export const updateInitiativeSchema = z.object({
  params: z.object({ initiativeId: objectId }),
  body: initiativeBody.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  }),
});

export const initiativeParamsSchema = z.object({ params: z.object({ initiativeId: objectId }) });

const portfolioBody = z.object({
  name: z.string().trim().min(2).max(180),
  description: optionalText(4000),
  ownerId: objectId.optional(),
  contributorIds,
  status: strategicStatus.default('active'),
  health: strategicHealth.default('no_status'),
});

export const createPortfolioSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: portfolioBody,
});

export const updatePortfolioSchema = z.object({
  params: z.object({ portfolioId: objectId }),
  body: portfolioBody.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  }),
});

export const portfolioParamsSchema = z.object({ params: z.object({ portfolioId: objectId }) });

export const createStrategicLinkSchema = z.object({
  body: z
    .object({
      workspaceId: objectId,
      sourceType: z.enum([
        'goal',
        'key_result',
        'initiative',
        'portfolio',
        'project',
        'board',
        'task',
        'milestone',
        'epic',
        'release',
      ]),
      sourceId: objectId,
      targetType: z.enum([
        'goal',
        'key_result',
        'initiative',
        'portfolio',
        'project',
        'board',
        'task',
        'milestone',
        'epic',
        'release',
      ]),
      targetId: objectId,
      relationshipType: z.enum([
        'supports',
        'contributes_to',
        'contains',
        'depends_on',
        'related_to',
      ]),
      weight: z.coerce.number().min(0).max(100).default(1),
    })
    .refine((value) => value.sourceType !== value.targetType || value.sourceId !== value.targetId, {
      message: 'Self links are not allowed',
      path: ['targetId'],
    }),
});

export const strategicLinkParamsSchema = z.object({ params: z.object({ linkId: objectId }) });

export type CreateGoalInput = z.infer<typeof createGoalSchema>['body'];
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>['body'];
export type CreateKeyResultInput = z.infer<typeof createKeyResultSchema>['body'];
export type UpdateKeyResultInput = z.infer<typeof updateKeyResultSchema>['body'];
export type CreateCheckInInput = z.infer<typeof createCheckInSchema>['body'];
export type CreateInitiativeInput = z.infer<typeof createInitiativeSchema>['body'];
export type UpdateInitiativeInput = z.infer<typeof updateInitiativeSchema>['body'];
export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>['body'];
export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>['body'];
export type CreateStrategicLinkInput = z.infer<typeof createStrategicLinkSchema>['body'];
