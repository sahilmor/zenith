import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from 'mongoose';

export const timeEntryStatuses = ['draft', 'submitted', 'approved', 'rejected'] as const;
export const resourceAllocationStatuses = ['planned', 'active', 'completed', 'canceled'] as const;
export const resourceAvailabilityTypes = [
  'holiday',
  'leave',
  'training',
  'focus',
  'unavailable',
] as const;

const timeEntrySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, default: null, trim: true, maxlength: 1000 },
    minutes: { type: Number, required: true, min: 1, max: 1440 },
    billable: { type: Boolean, default: false, index: true },
    startedAt: { type: Date, required: true, index: true },
    endedAt: { type: Date, required: true },
    timezone: { type: String, required: true, trim: true, maxlength: 80 },
    status: { type: String, enum: timeEntryStatuses, default: 'draft', index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

timeEntrySchema.index({ workspaceId: 1, userId: 1, startedAt: -1 });
timeEntrySchema.index({ workspaceId: 1, projectId: 1, startedAt: -1 });
timeEntrySchema.index({ workspaceId: 1, taskId: 1, startedAt: -1 });

const runningTimerSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, default: null, trim: true, maxlength: 1000 },
    billable: { type: Boolean, default: false },
    startedAt: { type: Date, required: true },
    lastHeartbeatAt: { type: Date, required: true },
    timezone: { type: String, required: true, trim: true, maxlength: 80 },
    idleSince: { type: Date, default: null },
  },
  { timestamps: true },
);

runningTimerSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

const weeklyScheduleSchema = new Schema(
  {
    monday: { type: Number, default: 480, min: 0, max: 1440 },
    tuesday: { type: Number, default: 480, min: 0, max: 1440 },
    wednesday: { type: Number, default: 480, min: 0, max: 1440 },
    thursday: { type: Number, default: 480, min: 0, max: 1440 },
    friday: { type: Number, default: 480, min: 0, max: 1440 },
    saturday: { type: Number, default: 0, min: 0, max: 1440 },
    sunday: { type: Number, default: 0, min: 0, max: 1440 },
  },
  { _id: false },
);

const resourceProfileSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: null, trim: true, maxlength: 120 },
    department: { type: String, default: null, trim: true, maxlength: 120, index: true },
    location: { type: String, default: null, trim: true, maxlength: 120 },
    timezone: { type: String, default: 'UTC', trim: true, maxlength: 80 },
    weeklyCapacityMinutes: { type: Number, default: 2400, min: 0, max: 10080 },
    costRate: { type: Number, default: null, min: 0 },
    billRate: { type: Number, default: null, min: 0 },
    skills: [
      {
        name: { type: String, required: true, trim: true, maxlength: 80 },
        level: { type: Number, default: 3, min: 1, max: 5 },
      },
    ],
    competencies: [{ type: String, trim: true, maxlength: 80 }],
    workingHours: { type: weeklyScheduleSchema, default: () => ({}) },
    active: { type: Boolean, default: true, index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

resourceProfileSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
resourceProfileSchema.index({ workspaceId: 1, department: 1, active: 1 });

const resourceAllocationSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, default: null, trim: true, maxlength: 120 },
    allocationPercent: { type: Number, required: true, min: 0, max: 200 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    status: { type: String, enum: resourceAllocationStatuses, default: 'planned', index: true },
    notes: { type: String, default: null, trim: true, maxlength: 1000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

resourceAllocationSchema.index({ workspaceId: 1, userId: 1, startDate: 1, endDate: 1 });
resourceAllocationSchema.index({ workspaceId: 1, projectId: 1, status: 1 });

const resourceAvailabilitySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: resourceAvailabilityTypes, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    minutesUnavailable: { type: Number, default: null, min: 0 },
    notes: { type: String, default: null, trim: true, maxlength: 1000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

resourceAvailabilitySchema.index({ workspaceId: 1, userId: 1, startDate: 1, endDate: 1 });

export type TimeEntry = InferSchemaType<typeof timeEntrySchema>;
export type RunningTimer = InferSchemaType<typeof runningTimerSchema>;
export type ResourceProfile = InferSchemaType<typeof resourceProfileSchema>;
export type ResourceAllocation = InferSchemaType<typeof resourceAllocationSchema>;
export type ResourceAvailability = InferSchemaType<typeof resourceAvailabilitySchema>;

export type TimeEntryDocument = HydratedDocument<TimeEntry>;
export type RunningTimerDocument = HydratedDocument<RunningTimer>;
export type ResourceProfileDocument = HydratedDocument<ResourceProfile>;
export type ResourceAllocationDocument = HydratedDocument<ResourceAllocation>;
export type ResourceAvailabilityDocument = HydratedDocument<ResourceAvailability>;

export const TimeEntryModel =
  (mongoose.models.TimeEntry as Model<TimeEntry> | undefined) ??
  model<TimeEntry>('TimeEntry', timeEntrySchema);
export const RunningTimerModel =
  (mongoose.models.RunningTimer as Model<RunningTimer> | undefined) ??
  model<RunningTimer>('RunningTimer', runningTimerSchema);
export const ResourceProfileModel =
  (mongoose.models.ResourceProfile as Model<ResourceProfile> | undefined) ??
  model<ResourceProfile>('ResourceProfile', resourceProfileSchema);
export const ResourceAllocationModel =
  (mongoose.models.ResourceAllocation as Model<ResourceAllocation> | undefined) ??
  model<ResourceAllocation>('ResourceAllocation', resourceAllocationSchema);
export const ResourceAvailabilityModel =
  (mongoose.models.ResourceAvailability as Model<ResourceAvailability> | undefined) ??
  model<ResourceAvailability>('ResourceAvailability', resourceAvailabilitySchema);
