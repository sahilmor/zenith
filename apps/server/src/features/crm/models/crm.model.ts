import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from 'mongoose';

export const crmAccountStatuses = ['prospect', 'customer', 'partner', 'former'] as const;
export const crmLeadStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;
export const crmDealStages = [
  'qualification',
  'discovery',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
] as const;
export const crmForecastCategories = ['pipeline', 'best_case', 'commit', 'closed'] as const;
export const crmActivityTypes = ['note', 'email', 'call', 'meeting', 'task', 'follow_up'] as const;
export const crmHealthStatuses = ['healthy', 'watch', 'at_risk', 'critical'] as const;

const crmCustomFieldValueSchema = new Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
    value: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

const crmAccountSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 180 },
    domain: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      maxlength: 180,
      index: true,
    },
    website: { type: String, default: null, trim: true, maxlength: 500 },
    industry: { type: String, default: null, trim: true, maxlength: 120, index: true },
    size: { type: String, default: null, trim: true, maxlength: 80 },
    status: { type: String, enum: crmAccountStatuses, default: 'prospect', index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    healthScore: { type: Number, default: 75, min: 0, max: 100, index: true },
    healthStatus: { type: String, enum: crmHealthStatuses, default: 'healthy', index: true },
    lifecycleStage: { type: String, default: 'lead', trim: true, maxlength: 80, index: true },
    renewalDate: { type: Date, default: null, index: true },
    onboardingProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 60 }],
    customFields: { type: [crmCustomFieldValueSchema], default: [] },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

crmAccountSchema.index({ workspaceId: 1, name: 1 });
crmAccountSchema.index(
  { workspaceId: 1, domain: 1 },
  { unique: true, partialFilterExpression: { domain: { $type: 'string' } } },
);

const crmContactSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'CrmAccount', default: null, index: true },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, default: null, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
      index: true,
    },
    phone: { type: String, default: null, trim: true, maxlength: 60 },
    title: { type: String, default: null, trim: true, maxlength: 120 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 60 }],
    customFields: { type: [crmCustomFieldValueSchema], default: [] },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

crmContactSchema.index({ workspaceId: 1, email: 1 }, { unique: true });
crmContactSchema.index({ workspaceId: 1, accountId: 1 });

const crmLeadSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    companyName: { type: String, required: true, trim: true, maxlength: 180 },
    contactName: { type: String, required: true, trim: true, maxlength: 160 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
      index: true,
    },
    source: { type: String, default: null, trim: true, maxlength: 120, index: true },
    status: { type: String, enum: crmLeadStatuses, default: 'new', index: true },
    score: { type: Number, default: 0, min: 0, max: 100, index: true },
    estimatedValue: { type: Number, default: 0, min: 0 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    convertedAccountId: { type: Schema.Types.ObjectId, ref: 'CrmAccount', default: null },
    convertedContactId: { type: Schema.Types.ObjectId, ref: 'CrmContact', default: null },
    convertedDealId: { type: Schema.Types.ObjectId, ref: 'CrmDeal', default: null },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 60 }],
    customFields: { type: [crmCustomFieldValueSchema], default: [] },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

crmLeadSchema.index({ workspaceId: 1, email: 1, archived: 1 });

const crmDealSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'CrmAccount', required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'CrmContact', default: null, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 180 },
    stage: { type: String, enum: crmDealStages, default: 'qualification', index: true },
    forecastCategory: {
      type: String,
      enum: crmForecastCategories,
      default: 'pipeline',
      index: true,
    },
    value: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'usd', trim: true, lowercase: true, maxlength: 3 },
    probability: { type: Number, default: 10, min: 0, max: 100 },
    expectedCloseDate: { type: Date, default: null, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    nextStep: { type: String, default: null, trim: true, maxlength: 500 },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 60 }],
    customFields: { type: [crmCustomFieldValueSchema], default: [] },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

crmDealSchema.index({ workspaceId: 1, stage: 1, expectedCloseDate: 1 });
crmDealSchema.index({ workspaceId: 1, ownerId: 1, stage: 1 });

const crmActivitySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'CrmAccount', default: null, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'CrmContact', default: null, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'CrmLead', default: null, index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'CrmDeal', default: null, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', default: null, index: true },
    type: { type: String, enum: crmActivityTypes, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    body: { type: String, default: null, trim: true, maxlength: 5000 },
    occurredAt: { type: Date, required: true, index: true },
    dueAt: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

crmActivitySchema.index({ workspaceId: 1, occurredAt: -1 });
crmActivitySchema.index({ workspaceId: 1, ownerId: 1, dueAt: 1 });

export type CrmAccount = InferSchemaType<typeof crmAccountSchema>;
export type CrmContact = InferSchemaType<typeof crmContactSchema>;
export type CrmLead = InferSchemaType<typeof crmLeadSchema>;
export type CrmDeal = InferSchemaType<typeof crmDealSchema>;
export type CrmActivity = InferSchemaType<typeof crmActivitySchema>;

export type CrmAccountDocument = HydratedDocument<CrmAccount>;
export type CrmContactDocument = HydratedDocument<CrmContact>;
export type CrmLeadDocument = HydratedDocument<CrmLead>;
export type CrmDealDocument = HydratedDocument<CrmDeal>;
export type CrmActivityDocument = HydratedDocument<CrmActivity>;

export const CrmAccountModel =
  (mongoose.models.CrmAccount as Model<CrmAccount> | undefined) ??
  model<CrmAccount>('CrmAccount', crmAccountSchema);
export const CrmContactModel =
  (mongoose.models.CrmContact as Model<CrmContact> | undefined) ??
  model<CrmContact>('CrmContact', crmContactSchema);
export const CrmLeadModel =
  (mongoose.models.CrmLead as Model<CrmLead> | undefined) ??
  model<CrmLead>('CrmLead', crmLeadSchema);
export const CrmDealModel =
  (mongoose.models.CrmDeal as Model<CrmDeal> | undefined) ??
  model<CrmDeal>('CrmDeal', crmDealSchema);
export const CrmActivityModel =
  (mongoose.models.CrmActivity as Model<CrmActivity> | undefined) ??
  model<CrmActivity>('CrmActivity', crmActivitySchema);
