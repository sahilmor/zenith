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
  'trialing' | 'active' | 'past_due' | 'grace_period' | 'suspended' | 'canceled' | 'expired';
export type BillingFeature =
  | 'kanban'
  | 'calendar'
  | 'table'
  | 'timeline'
  | 'advanced_search'
  | 'saved_views'
  | 'automations'
  | 'advanced_analytics'
  | 'audit_logs'
  | 'public_api'
  | 'webhooks'
  | 'pdf_export'
  | 'billing_portal'
  | 'documents';
export type BillingLimitKey =
  | 'members'
  | 'projects'
  | 'boards'
  | 'tasks'
  | 'storageBytes'
  | 'automations'
  | 'apiKeys'
  | 'webhooks'
  | 'reportExports'
  | 'documentSpaces'
  | 'documentPages';

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

export type ProjectVisibility = 'private' | 'public';
export type ProjectStatus = 'active' | 'archived';
export type BoardStatus = 'active' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'archived';
export type DocumentSpaceVisibility = 'workspace' | 'private';
export type DocumentPageStatus =
  'draft' | 'published' | 'archived' | 'deleted' | 'readonly' | 'template';
export type DocumentPermissionRole = 'owner' | 'editor' | 'commenter' | 'viewer' | 'none';
export type DocumentFavoriteTargetType = 'page' | 'space' | 'template';
export type DocumentPinScope = 'workspace' | 'space' | 'personal';
export type DocumentRelationshipTargetType =
  'page' | 'task' | 'project' | 'template' | 'document' | 'file';
export type DocumentRelationshipKind =
  'related_to' | 'depends_on' | 'parent_of' | 'child_of' | 'reference' | 'supersedes' | 'embed';
export type DocumentSubscriptionLevel =
  'all_updates' | 'major_updates' | 'comments_only' | 'mentions_only' | 'mute';
export type DocumentBlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'heading_4'
  | 'bullet_list'
  | 'numbered_list'
  | 'checklist'
  | 'quote'
  | 'divider'
  | 'callout'
  | 'code'
  | 'image'
  | 'pdf'
  | 'table'
  | 'toggle'
  | 'emoji'
  | 'mention'
  | 'task_embed'
  | 'project_embed';

export interface DocumentPermissionSummary {
  readonly userId: EntityId;
  readonly role: DocumentPermissionRole;
}

export interface DocumentSpaceSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly icon: string | null;
  readonly color: string | null;
  readonly banner: string | null;
  readonly homepagePageId: EntityId | null;
  readonly defaultTemplateId: EntityId | null;
  readonly defaultPermissions: DocumentPermissionSummary[];
  readonly archived: boolean;
  readonly visibility: DocumentSpaceVisibility;
  readonly ownerId: EntityId;
  readonly createdBy: EntityId;
  readonly updatedBy: EntityId | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface DocumentFolderSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly spaceId: EntityId;
  readonly parentFolderId: EntityId | null;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly icon: string | null;
  readonly order: number;
  readonly archived: boolean;
  readonly visibility: DocumentSpaceVisibility;
  readonly permissions: DocumentPermissionSummary[];
  readonly createdBy: EntityId;
  readonly updatedBy: EntityId | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface DocumentBlockSummary {
  readonly id: EntityId;
  readonly stableId: string;
  readonly pageId: EntityId;
  readonly parentBlockId: EntityId | null;
  readonly type: DocumentBlockType;
  readonly order: number;
  readonly content: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
  readonly createdBy: EntityId;
  readonly updatedBy: EntityId | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface DocumentPageSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly spaceId: EntityId;
  readonly folderId: EntityId | null;
  readonly parentPageId: EntityId | null;
  readonly title: string;
  readonly slug: string;
  readonly status: DocumentPageStatus;
  readonly icon: string | null;
  readonly coverImage: string | null;
  readonly summary: string | null;
  readonly properties: Record<string, unknown>;
  readonly tagIds: EntityId[];
  readonly currentVersion: number;
  readonly publishedVersion: number | null;
  readonly archived: boolean;
  readonly deletedAt: ISODateString | null;
  readonly ownerId: EntityId;
  readonly createdBy: EntityId;
  readonly updatedBy: EntityId | null;
  readonly permissions: DocumentPermissionSummary[];
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface DocumentPageDetailSummary extends DocumentPageSummary {
  readonly blocks: DocumentBlockSummary[];
  readonly breadcrumbs: {
    readonly id: EntityId;
    readonly title: string;
    readonly type: 'space' | 'folder' | 'page';
  }[];
  readonly outline: DocumentPageOutlineItem[];
  readonly backlinks: DocumentRelationshipSummary[];
  readonly forwardLinks: DocumentRelationshipSummary[];
  readonly watcher: DocumentWatcherSummary | null;
}

export interface DocumentPageOutlineItem {
  readonly blockId: EntityId;
  readonly stableId: string;
  readonly title: string;
  readonly level: 1 | 2 | 3 | 4;
}

export interface DocumentFavoriteSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly userId: EntityId;
  readonly targetType: DocumentFavoriteTargetType;
  readonly targetId: EntityId;
  readonly sortOrder: number;
  readonly createdAt: ISODateString;
}

export interface DocumentRecentPageSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly userId: EntityId;
  readonly page: DocumentPageSummary;
  readonly lastViewedAt: ISODateString;
  readonly lastPosition: Record<string, unknown> | null;
}

export interface DocumentPinSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly scope: DocumentPinScope;
  readonly spaceId: EntityId | null;
  readonly userId: EntityId | null;
  readonly page: DocumentPageSummary;
  readonly sortOrder: number;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
}

export interface DocumentRelationshipSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly sourcePageId: EntityId;
  readonly targetType: DocumentRelationshipTargetType;
  readonly targetId: EntityId;
  readonly targetPageId: EntityId | null;
  readonly relationshipType: DocumentRelationshipKind;
  readonly broken: boolean;
  readonly metadata: Record<string, unknown>;
  readonly createdBy: EntityId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface DocumentPageTagSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly name: string;
  readonly slug: string;
  readonly color: string;
  readonly description: string | null;
  readonly archived: boolean;
  readonly createdBy: EntityId;
  readonly updatedBy: EntityId | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface DocumentTemplateSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly spaceId: EntityId | null;
  readonly name: string;
  readonly category: string;
  readonly description: string | null;
  readonly icon: string | null;
  readonly blocks: DocumentBlockSummary[];
  readonly variables: string[];
  readonly favoriteCount: number;
  readonly useCount: number;
  readonly archived: boolean;
  readonly createdBy: EntityId;
  readonly updatedBy: EntityId | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface DocumentWatcherSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly pageId: EntityId;
  readonly userId: EntityId;
  readonly subscription: DocumentSubscriptionLevel;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface KnowledgeHomeSummary {
  readonly spaces: DocumentSpaceSummary[];
  readonly recentPages: DocumentRecentPageSummary[];
  readonly favorites: DocumentFavoriteSummary[];
  readonly pinnedPages: DocumentPinSummary[];
  readonly templates: DocumentTemplateSummary[];
}

export type SearchEntityType =
  | 'project'
  | 'board'
  | 'task'
  | 'document_space'
  | 'document_folder'
  | 'document_page'
  | 'document_template'
  | 'user'
  | 'attachment';
export type SearchSort = 'relevance' | 'updated' | 'created' | 'alphabetical' | 'popularity';

export interface SearchHighlightSummary {
  readonly field: 'title' | 'description' | 'content' | 'metadata' | 'tag';
  readonly snippet: string;
}

export interface SearchResultSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly entityId: EntityId;
  readonly entityType: SearchEntityType;
  readonly title: string;
  readonly description: string | null;
  readonly url: string;
  readonly score: number;
  readonly highlights: SearchHighlightSummary[];
  readonly metadata: Record<string, unknown>;
  readonly ownerId: EntityId | null;
  readonly updatedAt: ISODateString;
}

export interface SearchGroupSummary {
  readonly entityType: SearchEntityType;
  readonly total: number;
  readonly results: SearchResultSummary[];
}

export interface SearchResponseSummary {
  readonly query: string;
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly latencyMs: number;
  readonly results: SearchResultSummary[];
  readonly groups: SearchGroupSummary[];
}

export interface SearchSuggestionSummary {
  readonly id: string;
  readonly label: string;
  readonly entityType: SearchEntityType | 'query' | 'command';
  readonly entityId: EntityId | null;
  readonly url: string | null;
  readonly score: number;
}

export interface SavedSearchSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly userId: EntityId;
  readonly name: string;
  readonly query: string;
  readonly filters: Record<string, unknown>;
  readonly pinned: boolean;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface RecentSearchSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly userId: EntityId;
  readonly query: string;
  readonly filters: Record<string, unknown>;
  readonly createdAt: ISODateString;
}

export interface SearchAnalyticsSummary {
  readonly topQueries: { readonly query: string; readonly count: number }[];
  readonly noResultQueries: { readonly query: string; readonly count: number }[];
  readonly totalSearches: number;
  readonly averageLatencyMs: number;
}

export type DocumentSyncOperationType =
  | 'create_page'
  | 'update_page'
  | 'save_blocks'
  | 'archive_page'
  | 'restore_page'
  | 'delete_page'
  | 'comment'
  | 'favorite'
  | 'watch';
export type DocumentSyncOperationStatus = 'queued' | 'applied' | 'conflict' | 'failed' | 'canceled';
export type DocumentConnectionState =
  'online' | 'offline' | 'reconnecting' | 'syncing' | 'conflict' | 'failed';
export type DocumentImportFormat = 'markdown' | 'html' | 'text' | 'docx' | 'pdf';
export type DocumentExportFormat = 'markdown' | 'html' | 'pdf' | 'text' | 'json';
export type DocumentBulkAction =
  | 'archive'
  | 'restore'
  | 'delete'
  | 'duplicate'
  | 'move'
  | 'change_owner'
  | 'change_tags'
  | 'publish'
  | 'unpublish';

export interface DocumentSyncOperationSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly pageId: EntityId | null;
  readonly clientOperationId: string;
  readonly type: DocumentSyncOperationType;
  readonly status: DocumentSyncOperationStatus;
  readonly attempts: number;
  readonly error: string | null;
  readonly result: Record<string, unknown> | null;
  readonly baseUpdatedAt: ISODateString | null;
  readonly nextRetryAt: ISODateString | null;
  readonly appliedAt: ISODateString | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface DocumentSyncSummary {
  readonly status: DocumentConnectionState;
  readonly applied: DocumentSyncOperationSummary[];
  readonly conflicts: DocumentSyncOperationSummary[];
  readonly failed: DocumentSyncOperationSummary[];
  readonly serverTime: ISODateString;
}

export interface DocumentImportSummary {
  readonly page: DocumentPageDetailSummary;
  readonly format: DocumentImportFormat;
  readonly blockCount: number;
  readonly warnings: string[];
  readonly durationMs: number;
}

export interface DocumentExportSummary {
  readonly pageId: EntityId;
  readonly format: DocumentExportFormat;
  readonly fileName: string;
  readonly contentType: string;
  readonly size: number;
}

export interface DocumentBulkOperationSummary {
  readonly action: DocumentBulkAction;
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly results: {
    readonly pageId: EntityId;
    readonly status: 'succeeded' | 'failed';
    readonly message: string;
  }[];
}

export interface DocumentMediaAssetSummary {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly pageId: EntityId | null;
  readonly uploadedBy: EntityId;
  readonly fileName: string;
  readonly originalName: string;
  readonly fileType: string;
  readonly fileSize: number;
  readonly url: string;
  readonly usageCount: number;
  readonly archived: boolean;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface DocumentRetentionPolicySummary {
  readonly workspaceId: EntityId;
  readonly draftRetentionDays: number;
  readonly archiveRetentionDays: number;
  readonly deletedRetentionDays: number;
  readonly temporaryExportRetentionHours: number;
  readonly temporaryImportRetentionHours: number;
  readonly updatedBy: EntityId | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface DocumentVersionSummary {
  readonly id: EntityId;
  readonly pageId: EntityId;
  readonly version: number;
  readonly editorId: EntityId;
  readonly summary: string | null;
  readonly blockSnapshot: DocumentBlockSummary[];
  readonly metadata: Record<string, unknown>;
  readonly createdAt: ISODateString;
}

export interface DocumentCommentSummary {
  readonly id: EntityId;
  readonly pageId: EntityId;
  readonly blockId: EntityId | null;
  readonly parentCommentId: EntityId | null;
  readonly authorId: EntityId;
  readonly content: string;
  readonly mentionedUserIds: EntityId[];
  readonly resolved: boolean;
  readonly editedAt: ISODateString | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

export interface DocumentTreeSummary {
  readonly spaces: DocumentSpaceSummary[];
  readonly folders: DocumentFolderSummary[];
  readonly pages: DocumentPageSummary[];
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

export interface WorkspaceInvitationPreview {
  readonly workspaceId: EntityId;
  readonly workspaceName: string;
  readonly email: string;
  readonly role: WorkspaceRole;
  readonly expiresAt: ISODateString;
  readonly status: WorkspaceInvitationStatus;
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
  | 'document_space'
  | 'document_folder'
  | 'document_page'
  | 'document_blocks'
  | 'document_comment'
  | 'document_comment';

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
  | 'invited'
  | 'published';

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
