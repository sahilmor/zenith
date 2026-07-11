export type EntityId = string;

export type ISODateString = string;

export interface ApiEnvelope<TData> {
  readonly data: TData;
  readonly requestId: string;
}

export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'member' | 'guest';
export type WorkspaceMemberStatus = 'active' | 'invited' | 'suspended';
export type WorkspaceInvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type WorkspaceVisibility = 'private' | 'public';
export type WorkspacePlan = 'free' | 'pro' | 'business' | 'enterprise';
export type BillingInterval = 'monthly' | 'annual';
export type BillingProvider = 'local' | 'stripe';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';
export type BillingFeature =
  | 'kanban'
  | 'calendar'
  | 'table'
  | 'timeline'
  | 'advanced_search'
  | 'saved_views'
  | 'ai'
  | 'automations'
  | 'advanced_analytics'
  | 'audit_logs'
  | 'public_api'
  | 'webhooks'
  | 'pdf_export'
  | 'billing_portal'
  | 'strategic_planning'
  | 'strategic_analytics'
  | 'custom_fields'
  | 'custom_workflows'
  | 'public_forms'
  | 'templates';
export type BillingLimitKey =
  | 'members'
  | 'projects'
  | 'boards'
  | 'tasks'
  | 'storageBytes'
  | 'aiRequests'
  | 'automations'
  | 'apiKeys'
  | 'webhooks'
  | 'reportExports'
  | 'goals'
  | 'initiatives'
  | 'portfolios'
  | 'customFields'
  | 'taskTypes'
  | 'workflows'
  | 'activeForms'
  | 'templates';

export type BillingLimits = Record<BillingLimitKey, number | null>;

export interface BillingPlanSummary {
  readonly id: EntityId;
  readonly code: WorkspacePlan;
  readonly name: string;
  readonly description: string;
  readonly active: boolean;
  readonly displayOrder: number;
  readonly monthlyPrice: number | null;
  readonly annualPrice: number | null;
  readonly currency: string;
  readonly trialDays: number;
  readonly features: BillingFeature[];
  readonly limits: BillingLimits;
  readonly metadata: Record<string, string>;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface WorkspaceSubscriptionSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly provider: BillingProvider;
  readonly providerCustomerId: string | null;
  readonly providerSubscriptionId: string | null;
  readonly providerPriceId: string | null;
  readonly planCode: WorkspacePlan;
  readonly billingInterval: BillingInterval;
  readonly currency: string;
  readonly status: SubscriptionStatus;
  readonly trialStart: ISODateString | null;
  readonly trialEnd: ISODateString | null;
  readonly currentPeriodStart: ISODateString | null;
  readonly currentPeriodEnd: ISODateString | null;
  readonly cancelAtPeriodEnd: boolean;
  readonly canceledAt: ISODateString | null;
  readonly endedAt: ISODateString | null;
  readonly gracePeriodEndsAt: ISODateString | null;
  readonly metadata: Record<string, string>;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export type BillingUsage = Record<BillingLimitKey, number>;

export interface WorkspaceEntitlementSummary {
  readonly plan: BillingPlanSummary;
  readonly subscription: WorkspaceSubscriptionSummary;
  readonly features: Record<BillingFeature, boolean>;
  readonly limits: BillingLimits;
  readonly usage: BillingUsage;
  readonly exceededLimits: BillingLimitKey[];
}

export interface BillingInvoiceSummary {
  readonly id: EntityId;
  readonly providerInvoiceId: string | null;
  readonly date: ISODateString;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
  readonly hostedInvoiceUrl: string | null;
  readonly invoicePdfUrl: string | null;
}

export interface WorkspaceBillingSummary {
  readonly workspaceId: EntityId;
  readonly plan: BillingPlanSummary;
  readonly subscription: WorkspaceSubscriptionSummary;
  readonly entitlements: WorkspaceEntitlementSummary;
  readonly billingEnabled: boolean;
}
export type StrategicGoalType =
  'objective' | 'goal' | 'company_goal' | 'team_goal' | 'personal_goal';
export type StrategicStatus = 'draft' | 'active' | 'at_risk' | 'achieved' | 'missed' | 'canceled';
export type StrategicHealth = 'on_track' | 'at_risk' | 'off_track' | 'no_status';
export type StrategicProgressMode = 'manual' | 'automatic';
export type KeyResultMeasurementType =
  | 'number'
  | 'percentage'
  | 'currency'
  | 'boolean'
  | 'task_completion'
  | 'project_progress'
  | 'milestone_progress'
  | 'custom';
export type StrategicLinkEntityType =
  | 'goal'
  | 'key_result'
  | 'initiative'
  | 'portfolio'
  | 'project'
  | 'board'
  | 'task'
  | 'milestone'
  | 'epic'
  | 'release';
export type StrategicRelationshipType =
  'supports' | 'contributes_to' | 'contains' | 'depends_on' | 'related_to';
export type StrategicPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface GoalSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly title: string;
  readonly description: string | null;
  readonly type: StrategicGoalType;
  readonly status: StrategicStatus;
  readonly health: StrategicHealth;
  readonly ownerId: EntityId;
  readonly contributorIds: EntityId[];
  readonly parentGoalId: EntityId | null;
  readonly startDate: ISODateString | null;
  readonly targetDate: ISODateString | null;
  readonly progressMode: StrategicProgressMode;
  readonly manualProgress: number;
  readonly calculatedProgress: number;
  readonly confidence: number;
  readonly archived: boolean;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface KeyResultSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly goalId: EntityId;
  readonly title: string;
  readonly description: string | null;
  readonly ownerId: EntityId;
  readonly contributorIds: EntityId[];
  readonly measurementType: KeyResultMeasurementType;
  readonly unit: string | null;
  readonly startValue: number;
  readonly currentValue: number;
  readonly targetValue: number;
  readonly progress: number;
  readonly status: StrategicStatus;
  readonly health: StrategicHealth;
  readonly confidence: number;
  readonly startDate: ISODateString | null;
  readonly targetDate: ISODateString | null;
  readonly archived: boolean;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface StrategicCheckInSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly goalId: EntityId;
  readonly keyResultId: EntityId | null;
  readonly authorId: EntityId;
  readonly progress: number;
  readonly health: StrategicHealth;
  readonly confidence: number;
  readonly summary: string;
  readonly blockers: string | null;
  readonly nextSteps: string | null;
  readonly createdAt: ISODateString;
}

export interface InitiativeSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly name: string;
  readonly description: string | null;
  readonly status: StrategicStatus;
  readonly health: StrategicHealth;
  readonly priority: StrategicPriority;
  readonly ownerId: EntityId;
  readonly contributorIds: EntityId[];
  readonly startDate: ISODateString | null;
  readonly targetDate: ISODateString | null;
  readonly progressMode: StrategicProgressMode;
  readonly progress: number;
  readonly archived: boolean;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface PortfolioSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly name: string;
  readonly description: string | null;
  readonly ownerId: EntityId;
  readonly contributorIds: EntityId[];
  readonly status: StrategicStatus;
  readonly health: StrategicHealth;
  readonly progress: number;
  readonly archived: boolean;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface StrategicLinkSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly sourceType: StrategicLinkEntityType;
  readonly sourceId: EntityId;
  readonly targetType: StrategicLinkEntityType;
  readonly targetId: EntityId;
  readonly relationshipType: StrategicRelationshipType;
  readonly weight: number;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
}

export interface StrategicDashboardSummary {
  readonly workspaceId: EntityId;
  readonly generatedAt: ISODateString;
  readonly goalsByStatus: AnalyticsBucket[];
  readonly goalsByHealth: AnalyticsBucket[];
  readonly initiativesByHealth: AnalyticsBucket[];
  readonly portfoliosByHealth: AnalyticsBucket[];
  readonly atRiskGoals: GoalSummary[];
  readonly upcomingTargets: GoalSummary[];
  readonly averageGoalProgress: number;
  readonly keyResultAverageProgress: number;
  readonly strategicRisks: {
    readonly id: string;
    readonly entityType: 'goal' | 'initiative' | 'portfolio';
    readonly entityId: EntityId;
    readonly severity: 'low' | 'medium' | 'high';
    readonly source: 'deterministic' | 'ai_suggested';
    readonly reason: string;
  }[];
}
export type ProjectVisibility = 'private' | 'public';
export type ProjectStatus = 'active' | 'archived';
export type BoardStatus = 'active' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'archived';
export type CustomFieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'integer'
  | 'decimal'
  | 'currency'
  | 'percentage'
  | 'boolean'
  | 'checkbox'
  | 'single_select'
  | 'multi_select'
  | 'date'
  | 'datetime'
  | 'user'
  | 'multi_user'
  | 'email'
  | 'phone'
  | 'url'
  | 'duration'
  | 'rating'
  | 'relation'
  | 'formula';
export type WorkflowStateCategory = 'backlog' | 'todo' | 'in_progress' | 'done' | 'canceled';
export type TaskTypeCategory =
  'task' | 'bug' | 'story' | 'feature' | 'incident' | 'request' | 'custom';
export type TemplateType = 'workspace' | 'project' | 'board' | 'task' | 'form' | 'workflow';
export type IntakeFormVisibility = 'internal' | 'public';

export interface CustomFieldOptionSummary {
  readonly id: string;
  readonly label: string;
  readonly color: string | null;
  readonly description: string | null;
  readonly order: number;
  readonly archived: boolean;
}

export interface CustomFieldValidationSummary {
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly min?: number;
  readonly max?: number;
  readonly precision?: number;
  readonly minDate?: ISODateString;
  readonly maxDate?: ISODateString;
  readonly minSelections?: number;
  readonly maxSelections?: number;
}

export interface CustomFieldDefinitionSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly projectIds: EntityId[];
  readonly taskTypeIds: EntityId[];
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly fieldType: CustomFieldType;
  readonly required: boolean;
  readonly defaultValue: unknown;
  readonly options: CustomFieldOptionSummary[];
  readonly validation: CustomFieldValidationSummary;
  readonly visibility: 'always' | 'internal';
  readonly searchable: boolean;
  readonly filterable: boolean;
  readonly sortable: boolean;
  readonly groupable: boolean;
  readonly analyticsEnabled: boolean;
  readonly archived: boolean;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface CustomFieldValueSummary {
  readonly fieldId: EntityId;
  readonly key: string;
  readonly fieldType: CustomFieldType;
  readonly value: unknown;
}

export interface TaskTypeSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly name: string;
  readonly key: string;
  readonly description: string | null;
  readonly icon: string | null;
  readonly color: string;
  readonly category: TaskTypeCategory;
  readonly defaultWorkflowId: EntityId | null;
  readonly fieldIds: EntityId[];
  readonly requiredFieldIds: EntityId[];
  readonly defaultPriority: TaskPriority;
  readonly defaultLabels: string[];
  readonly descriptionTemplate: string | null;
  readonly archived: boolean;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface WorkflowStateSummary {
  readonly id: string;
  readonly name: string;
  readonly category: WorkflowStateCategory;
  readonly color: string;
  readonly description: string | null;
  readonly order: number;
  readonly terminal: boolean;
  readonly columnId: EntityId | null;
}

export interface WorkflowTransitionSummary {
  readonly id: string;
  readonly name: string;
  readonly fromStateId: string;
  readonly toStateId: string;
  readonly requiredRoles: WorkspaceRole[];
  readonly requiredFieldIds: EntityId[];
  readonly requireAssignee: boolean;
  readonly requireReporter: boolean;
  readonly requireAllSubtasksComplete: boolean;
}

export interface WorkflowSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly name: string;
  readonly description: string | null;
  readonly states: WorkflowStateSummary[];
  readonly transitions: WorkflowTransitionSummary[];
  readonly initialStateId: string;
  readonly terminalStateIds: string[];
  readonly version: number;
  readonly active: boolean;
  readonly archived: boolean;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface IntakeFormFieldSummary {
  readonly id: string;
  readonly fieldId: EntityId | null;
  readonly label: string;
  readonly fieldType: CustomFieldType | 'title' | 'description' | 'priority';
  readonly required: boolean;
  readonly order: number;
  readonly instructions: string | null;
  readonly hidden: boolean;
  readonly defaultValue: unknown;
}

export interface IntakeFormSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly name: string;
  readonly description: string | null;
  readonly visibility: IntakeFormVisibility;
  readonly slug: string;
  readonly destinationProjectId: EntityId;
  readonly destinationBoardId: EntityId;
  readonly destinationColumnId: EntityId;
  readonly destinationTaskTypeId: EntityId | null;
  readonly active: boolean;
  readonly expiresAt: ISODateString | null;
  readonly fields: IntakeFormFieldSummary[];
  readonly confirmationMessage: string;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface FormSubmissionSummary {
  readonly id: EntityId;
  readonly formId: EntityId;
  readonly workspaceId: EntityId;
  readonly submittedBy: EntityId | null;
  readonly createdTaskId: EntityId | null;
  readonly status: 'accepted' | 'failed';
  readonly createdAt: ISODateString;
}

export interface TemplateSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly name: string;
  readonly description: string | null;
  readonly templateType: TemplateType;
  readonly version: number;
  readonly active: boolean;
  readonly archived: boolean;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface WorkspaceSettings {
  readonly allowPublicDiscovery: boolean;
}

export interface WorkspaceSummary {
  readonly id: EntityId;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly logo: string | null;
  readonly ownerId: EntityId;
  readonly visibility: WorkspaceVisibility;
  readonly plan: WorkspacePlan;
  readonly settings: WorkspaceSettings;
  readonly archived: boolean;
  readonly currentUserRole?: WorkspaceRole;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface WorkspaceMemberUser {
  readonly id: EntityId;
  readonly name: string;
  readonly email: string;
  readonly avatar: string | null;
}

export interface WorkspaceMemberSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly userId: EntityId;
  readonly role: WorkspaceRole;
  readonly status: WorkspaceMemberStatus;
  readonly invitedBy?: EntityId | null;
  readonly joinedAt?: ISODateString | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly user?: WorkspaceMemberUser;
}

export interface WorkspaceInvitationSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly email: string;
  readonly role: WorkspaceRole;
  readonly invitedBy: EntityId;
  readonly expiresAt: ISODateString;
  readonly acceptedAt?: ISODateString | null;
  readonly status: WorkspaceInvitationStatus;
  readonly createdAt: ISODateString;
}

export interface ProjectSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly name: string;
  readonly key: string;
  readonly description: string | null;
  readonly icon: string | null;
  readonly color: string | null;
  readonly coverImage: string | null;
  readonly visibility: ProjectVisibility;
  readonly status: ProjectStatus;
  readonly ownerId: EntityId;
  readonly createdBy: EntityId;
  readonly archivedAt: ISODateString | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface BoardSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly projectId: EntityId;
  readonly name: string;
  readonly description: string | null;
  readonly isDefault: boolean;
  readonly archived: boolean;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface ColumnSummary {
  readonly id: EntityId;
  readonly boardId: EntityId;
  readonly name: string;
  readonly color: string | null;
  readonly order: number;
  readonly limit: number | null;
  readonly archived: boolean;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface TaskSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly projectId: EntityId;
  readonly boardId: EntityId;
  readonly columnId: EntityId;
  readonly title: string;
  readonly description: string | null;
  readonly order: number;
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly assigneeIds: EntityId[];
  readonly reporterId: EntityId;
  readonly labels: string[];
  readonly dueDate: ISODateString | null;
  readonly startDate: ISODateString | null;
  readonly estimate: number | null;
  readonly coverImage: string | null;
  readonly taskTypeId: EntityId | null;
  readonly workflowId: EntityId | null;
  readonly workflowStateId: string | null;
  readonly customFields: CustomFieldValueSummary[];
  readonly archived: boolean;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface TaskListSummary {
  readonly items: TaskSummary[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly hasMore: boolean;
}

export interface AnalyticsBucket {
  readonly key: string;
  readonly label: string;
  readonly value: number;
}

export interface AnalyticsKpiSummary {
  readonly totalTasks: number;
  readonly openTasks: number;
  readonly completedTasks: number;
  readonly archivedTasks: number;
  readonly overdueTasks: number;
  readonly upcomingTasks: number;
  readonly completionRate: number;
  readonly averageCompletionHours: number;
  readonly averageCycleHours: number;
  readonly averageLeadHours: number;
  readonly overduePercentage: number;
  readonly velocity: number;
  readonly productivityScore: number;
}

export interface AnalyticsTaskListItem {
  readonly id: EntityId;
  readonly title: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly assigneeIds: EntityId[];
  readonly dueDate: ISODateString | null;
  readonly updatedAt: ISODateString;
}

export interface AnalyticsActivityItem {
  readonly id: EntityId;
  readonly actorId: EntityId;
  readonly event: string;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: ISODateString;
}

export interface AnalyticsWorkloadItem {
  readonly userId: EntityId;
  readonly assignedTasks: number;
  readonly completedTasks: number;
  readonly overdueTasks: number;
  readonly capacity: number;
  readonly utilization: number;
  readonly state: 'underutilized' | 'balanced' | 'overloaded';
}

export interface AnalyticsDashboardSummary {
  readonly scope: 'workspace' | 'project' | 'board' | 'user';
  readonly scopeId: EntityId;
  readonly generatedAt: ISODateString;
  readonly dateRange: {
    readonly from: ISODateString | null;
    readonly to: ISODateString | null;
  };
  readonly kpis: AnalyticsKpiSummary;
  readonly tasksByStatus: AnalyticsBucket[];
  readonly tasksByPriority: AnalyticsBucket[];
  readonly tasksByAssignee: AnalyticsBucket[];
  readonly tasksByLabel: AnalyticsBucket[];
  readonly tasksPerColumn: AnalyticsBucket[];
  readonly completedTrend: AnalyticsBucket[];
  readonly activityTrend: AnalyticsBucket[];
  readonly recentlyUpdated: AnalyticsTaskListItem[];
  readonly teamActivity: AnalyticsActivityItem[];
  readonly workload: AnalyticsWorkloadItem[];
  readonly projectProgress: AnalyticsBucket[];
  readonly boardProgress: AnalyticsBucket[];
}

export type AnalyticsReportScope =
  'workspace' | 'project' | 'board' | 'user' | 'labels' | 'dueDates' | 'completion';
export type AnalyticsReportFormat = 'json' | 'csv' | 'xlsx' | 'pdf';

export interface AnalyticsReportRow {
  readonly id: EntityId;
  readonly title: string;
  readonly workspaceId: EntityId;
  readonly projectId: EntityId;
  readonly boardId: EntityId;
  readonly columnId: EntityId;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly assigneeIds: EntityId[];
  readonly labels: string[];
  readonly dueDate: ISODateString | null;
  readonly startDate: ISODateString | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface AnalyticsReportSummary {
  readonly scope: AnalyticsReportScope;
  readonly generatedAt: ISODateString;
  readonly rows: AnalyticsReportRow[];
  readonly totals: AnalyticsKpiSummary;
}

export type AiProviderId = 'local' | 'openai' | 'anthropic' | 'gemini';
export type AiMessageRole = 'system' | 'user' | 'assistant';
export type AiContextResource = 'workspace' | 'project' | 'board' | 'task';

export interface AiReference {
  readonly type: AiContextResource;
  readonly id: EntityId;
  readonly label: string;
}

export interface AiConversationMessage {
  readonly id: EntityId;
  readonly role: AiMessageRole;
  readonly content: string;
  readonly references: AiReference[];
  readonly createdAt: ISODateString;
}

export interface AiConversationSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly userId: EntityId;
  readonly title: string;
  readonly pinned: boolean;
  readonly provider: AiProviderId;
  readonly messages: AiConversationMessage[];
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export type AiActionType =
  | 'generate_tasks'
  | 'break_task_into_subtasks'
  | 'summarize_task'
  | 'summarize_project'
  | 'summarize_workspace'
  | 'summarize_comments'
  | 'meeting_notes'
  | 'release_notes'
  | 'suggest_priority'
  | 'suggest_labels'
  | 'suggest_due_date'
  | 'suggest_assignees'
  | 'project_description'
  | 'board_description'
  | 'improve_task_title'
  | 'rewrite_description'
  | 'translate_comment'
  | 'detect_duplicates'
  | 'related_tasks'
  | 'generate_checklist'
  | 'recurring_template';

export interface AiActionResult {
  readonly action: AiActionType;
  readonly content: string;
  readonly suggestions: string[];
  readonly references: AiReference[];
}

export interface AiSearchResult {
  readonly query: string;
  readonly filters: Record<string, string | string[] | boolean | number>;
  readonly tasks: TaskSummary[];
}

export type PromptScope = 'global' | 'workspace' | 'project';

export interface PromptSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly projectId: EntityId | null;
  readonly scope: PromptScope;
  readonly name: string;
  readonly content: string;
  readonly variables: string[];
  readonly version: number;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export type AutomationTriggerType =
  | 'task_created'
  | 'task_updated'
  | 'task_moved'
  | 'task_assigned'
  | 'task_completed'
  | 'due_date_reached'
  | 'comment_added'
  | 'attachment_uploaded'
  | 'workspace_invitation_accepted';

export type AutomationActionType =
  | 'assign_user'
  | 'move_task'
  | 'change_status'
  | 'change_priority'
  | 'create_task'
  | 'create_comment'
  | 'send_notification'
  | 'call_ai'
  | 'webhook'
  | 'email';

export interface AutomationCondition {
  readonly field: string;
  readonly operator: 'equals' | 'not_equals' | 'contains' | 'exists';
  readonly value: string;
}

export interface AutomationAction {
  readonly type: AutomationActionType;
  readonly params: Record<string, string | string[] | boolean | number | null>;
}

export interface AutomationRuleSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly projectId: EntityId | null;
  readonly name: string;
  readonly description: string | null;
  readonly enabled: boolean;
  readonly trigger: AutomationTriggerType;
  readonly conditions: AutomationCondition[];
  readonly actions: AutomationAction[];
  readonly createdBy: EntityId;
  readonly lastRunAt: ISODateString | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface AutomationExecutionSummary {
  readonly id: EntityId;
  readonly ruleId: EntityId;
  readonly workspaceId: EntityId;
  readonly actorId: EntityId;
  readonly status: 'success' | 'skipped' | 'failed';
  readonly message: string;
  readonly createdAt: ISODateString;
}

export interface SubtaskSummary {
  readonly id: EntityId;
  readonly taskId: EntityId;
  readonly title: string;
  readonly completed: boolean;
  readonly order: number;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface TaskMentionSummary {
  readonly userId: EntityId;
}

export interface TaskCommentSummary {
  readonly id: EntityId;
  readonly taskId: EntityId;
  readonly parentCommentId: EntityId | null;
  readonly authorId: EntityId;
  readonly content: string;
  readonly mentionedUserIds: EntityId[];
  readonly editedAt: ISODateString | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface TaskAttachmentSummary {
  readonly id: EntityId;
  readonly taskId: EntityId;
  readonly uploadedBy: EntityId;
  readonly fileName: string;
  readonly originalName: string;
  readonly fileType: string;
  readonly fileSize: number;
  readonly cloudinaryPublicId: string;
  readonly url: string;
  readonly createdAt: ISODateString;
}

export interface TaskActivitySummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly projectId: EntityId;
  readonly boardId: EntityId;
  readonly taskId: EntityId;
  readonly userId: EntityId;
  readonly action: string;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: ISODateString;
}

export interface TaskLabelSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly name: string;
  readonly color: string;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface TaskWatcherSummary {
  readonly id: EntityId;
  readonly taskId: EntityId;
  readonly userId: EntityId;
  readonly createdAt: ISODateString;
}

export type RealtimeResource =
  | 'workspace'
  | 'project'
  | 'board'
  | 'column'
  | 'task'
  | 'comment'
  | 'attachment'
  | 'label'
  | 'watcher'
  | 'member'
  | 'notification'
  | 'goal'
  | 'key_result'
  | 'check_in'
  | 'initiative'
  | 'portfolio'
  | 'strategic_link';

export type RealtimeAction =
  | 'created'
  | 'updated'
  | 'archived'
  | 'restored'
  | 'deleted'
  | 'moved'
  | 'reordered'
  | 'uploaded'
  | 'removed'
  | 'joined'
  | 'left'
  | 'invited';

export interface RealtimeMutationPayload<TData = unknown> {
  readonly id: string;
  readonly resource: RealtimeResource;
  readonly action: RealtimeAction;
  readonly workspaceId: EntityId;
  readonly projectId?: EntityId;
  readonly boardId?: EntityId;
  readonly taskId?: EntityId;
  readonly actorId: EntityId;
  readonly data?: TData;
  readonly timestamp: ISODateString;
}

export interface PresenceUserSummary {
  readonly userId: EntityId;
  readonly name: string;
  readonly email: string;
  readonly avatar: string | null;
  readonly online: boolean;
  readonly lastSeen: ISODateString;
  readonly connectionCount: number;
}

export interface PresenceSnapshotPayload {
  readonly scope: 'workspace' | 'project' | 'board' | 'task';
  readonly roomId: EntityId;
  readonly users: PresenceUserSummary[];
}

export interface TypingPayload {
  readonly workspaceId: EntityId;
  readonly taskId: EntityId;
  readonly userId: EntityId;
  readonly name: string;
  readonly typing: boolean;
  readonly timestamp: ISODateString;
}

export interface RealtimeNotificationPayload {
  readonly id: string;
  readonly workspaceId: EntityId;
  readonly recipientId: EntityId;
  readonly actorId: EntityId;
  readonly type:
    'mention' | 'task_assignment' | 'task_completion' | 'comment_reply' | 'workspace_invitation';
  readonly taskId?: EntityId;
  readonly message: string;
  readonly timestamp: ISODateString;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_unassigned'
  | 'task_mention'
  | 'comment_mention'
  | 'comment_reply'
  | 'task_moved'
  | 'task_due_soon'
  | 'task_overdue'
  | 'workspace_invitation'
  | 'workspace_role_changed'
  | 'project_created'
  | 'board_created'
  | 'attachment_uploaded'
  | 'task_archived'
  | 'task_restored'
  | 'system_announcement';

export interface NotificationSummary {
  readonly id: EntityId;
  readonly userId: EntityId;
  readonly workspaceId: EntityId | null;
  readonly projectId: EntityId | null;
  readonly taskId: EntityId | null;
  readonly actorId: EntityId | null;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly metadata: Record<string, unknown>;
  readonly isRead: boolean;
  readonly readAt: ISODateString | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface NotificationListSummary {
  readonly items: NotificationSummary[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly hasMore: boolean;
}

export interface NotificationPreferencesSummary {
  readonly userId: EntityId;
  readonly inApp: boolean;
  readonly email: boolean;
  readonly assignments: boolean;
  readonly comments: boolean;
  readonly mentions: boolean;
  readonly dueDates: boolean;
  readonly workspace: boolean;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}
