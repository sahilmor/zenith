import type {
  AnalyticsBucket,
  AnalyticsDashboardSummary,
  AnalyticsKpiSummary,
  AnalyticsReportFormat,
  AnalyticsReportRow,
  AnalyticsReportScope,
  AnalyticsReportSummary,
  AnalyticsTaskListItem,
  AnalyticsWorkloadItem,
  TaskPriority,
  TaskStatus,
} from '@pm/types';
import { strToU8, zipSync } from 'fflate';
import type { Types } from 'mongoose';
import PDFDocument from 'pdfkit';
import { BoardRepository } from '../../boards/repositories/board.repository.js';
import { ProjectRepository } from '../../projects/repositories/project.repository.js';
import type { TaskDocument } from '../../tasks/models/task.model.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import { ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import {
  AnalyticsRepository,
  type AnalyticsScopeQuery,
  type CountBucket,
} from '../repositories/analytics.repository.js';

interface DateRangeInput {
  readonly from?: string | undefined;
  readonly to?: string | undefined;
}

export interface ReportInput extends DateRangeInput {
  readonly scope: AnalyticsReportScope;
  readonly workspaceId?: Types.ObjectId;
  readonly projectId?: Types.ObjectId;
  readonly boardId?: Types.ObjectId;
  readonly userId?: Types.ObjectId;
  readonly format: AnalyticsReportFormat;
  readonly status?: TaskStatus;
  readonly priority?: TaskPriority;
  readonly search?: string;
}

export interface ReportExport {
  readonly fileName: string;
  readonly contentType: string;
  readonly body: Buffer | string | AnalyticsReportSummary;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_CAPACITY = 12;

const toDate = (value: string | undefined): Date | undefined =>
  value ? new Date(value) : undefined;

const idToString = (value: unknown): string => String(value);

const round = (value: number): number => Math.round(value * 100) / 100;

const labelize = (value: string): string =>
  value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export class AnalyticsService {
  private readonly analytics = new AnalyticsRepository();
  private readonly workspaces = new WorkspaceRepository();
  private readonly projects = new ProjectRepository();
  private readonly boards = new BoardRepository();

  public async getWorkspaceAnalytics(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    range: DateRangeInput,
  ): Promise<AnalyticsDashboardSummary> {
    await this.requireWorkspaceAccess(workspaceId, userId);
    return this.buildSummary('workspace', idToString(workspaceId), {
      workspaceId,
      ...this.toRange(range),
    });
  }

  public async getProjectAnalytics(
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
    range: DateRangeInput,
  ): Promise<AnalyticsDashboardSummary> {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');
    await this.requireWorkspaceAccess(project.workspaceId, userId);
    return this.buildSummary('project', idToString(projectId), {
      workspaceId: project.workspaceId,
      projectId,
      ...this.toRange(range),
    });
  }

  public async getBoardAnalytics(
    boardId: Types.ObjectId,
    userId: Types.ObjectId,
    range: DateRangeInput,
  ): Promise<AnalyticsDashboardSummary> {
    const board = await this.boards.findById(boardId);
    if (!board) throw new NotFoundError('Board not found');
    await this.requireWorkspaceAccess(board.workspaceId, userId);
    return this.buildSummary('board', idToString(boardId), {
      workspaceId: board.workspaceId,
      projectId: board.projectId,
      boardId,
      ...this.toRange(range),
    });
  }

  public async getUserAnalytics(
    workspaceId: Types.ObjectId,
    targetUserId: Types.ObjectId,
    userId: Types.ObjectId,
    range: DateRangeInput,
  ): Promise<AnalyticsDashboardSummary> {
    await this.requireWorkspaceAccess(workspaceId, userId);
    return this.buildSummary('user', idToString(targetUserId), {
      workspaceId,
      userId: targetUserId,
      ...this.toRange(range),
    });
  }

  public async generateReport(input: ReportInput, userId: Types.ObjectId): Promise<ReportExport> {
    const scope = await this.resolveReportScope(input, userId);
    const report = await this.buildReport(input.scope, scope);
    const stamp = new Date().toISOString().slice(0, 10);
    const baseName = `zenith-${input.scope}-report-${stamp}`;

    if (input.format === 'json') {
      return {
        fileName: `${baseName}.json`,
        contentType: 'application/json',
        body: report,
      };
    }
    if (input.format === 'csv') {
      return {
        fileName: `${baseName}.csv`,
        contentType: 'text/csv; charset=utf-8',
        body: this.toCsv(report),
      };
    }
    if (input.format === 'xlsx') {
      return {
        fileName: `${baseName}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: await this.toXlsx(report),
      };
    }
    return {
      fileName: `${baseName}.pdf`,
      contentType: 'application/pdf',
      body: await this.toPdf(report),
    };
  }

  private async buildSummary(
    scope: AnalyticsDashboardSummary['scope'],
    scopeId: string,
    query: AnalyticsScopeQuery,
  ): Promise<AnalyticsDashboardSummary> {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + WEEK_MS);
    const [
      totalTasks,
      openTasks,
      completedTasks,
      archivedTasks,
      overdueTasks,
      upcomingTasks,
      averageCompletionHours,
      tasksByStatus,
      tasksByPriority,
      tasksByAssignee,
      tasksByLabel,
      tasksPerColumn,
      completedTrend,
      activityTrend,
      recentlyUpdated,
      teamActivity,
      projectProgress,
      boardProgress,
    ] = await Promise.all([
      this.analytics.countTasks(query),
      this.analytics.countOpen(query),
      this.analytics.countCompleted(query),
      this.analytics.countArchived(query),
      this.analytics.countOverdue(query, now),
      this.analytics.countUpcoming(query, now, nextWeek),
      this.analytics.averageCompletionHours(query),
      this.analytics.countByField(query, 'status'),
      this.analytics.countByField(query, 'priority'),
      this.analytics.countByArrayField(query, 'assigneeIds'),
      this.analytics.countByArrayField(query, 'labels'),
      this.analytics.countPerColumn(query),
      this.analytics.trendByCompletion(query),
      this.analytics.trendByActivity(query),
      this.analytics.recentTasks(query),
      this.analytics.taskActivity(query),
      query.workspaceId ? this.analytics.projectProgress(query.workspaceId) : Promise.resolve([]),
      this.analytics.boardProgress(query),
    ]);
    const workload = query.workspaceId ? await this.buildWorkload(query.workspaceId, now) : [];

    return {
      scope,
      scopeId,
      generatedAt: new Date().toISOString(),
      dateRange: {
        from: query.from?.toISOString() ?? null,
        to: query.to?.toISOString() ?? null,
      },
      kpis: this.toKpis({
        totalTasks,
        openTasks,
        completedTasks,
        archivedTasks,
        overdueTasks,
        upcomingTasks,
        averageCompletionHours,
      }),
      tasksByStatus: this.normalizeBuckets(tasksByStatus),
      tasksByPriority: this.normalizeBuckets(tasksByPriority),
      tasksByAssignee: this.normalizeBuckets(tasksByAssignee),
      tasksByLabel: this.normalizeBuckets(tasksByLabel),
      tasksPerColumn: this.normalizeBuckets(tasksPerColumn),
      completedTrend: this.normalizeBuckets(completedTrend),
      activityTrend: this.normalizeBuckets(activityTrend),
      recentlyUpdated: recentlyUpdated.map((task) => this.toTaskListItem(task)),
      teamActivity: teamActivity.map((event) => ({
        id: event.id,
        actorId: idToString(event.actorId),
        event: event.event,
        metadata: event.metadata as Record<string, unknown>,
        createdAt: event.createdAt.toISOString(),
      })),
      workload,
      projectProgress: this.normalizeBuckets(projectProgress, true),
      boardProgress: this.normalizeBuckets(boardProgress, true),
    };
  }

  private async buildReport(
    scopeName: AnalyticsReportScope,
    query: AnalyticsScopeQuery,
  ): Promise<AnalyticsReportSummary> {
    const [
      tasks,
      totalTasks,
      openTasks,
      completedTasks,
      archivedTasks,
      overdueTasks,
      upcomingTasks,
      averageCompletionHours,
    ] = await Promise.all([
      this.analytics.reportTasks(query),
      this.analytics.countTasks(query),
      this.analytics.countOpen(query),
      this.analytics.countCompleted(query),
      this.analytics.countArchived(query),
      this.analytics.countOverdue(query, new Date()),
      this.analytics.countUpcoming(query, new Date(), new Date(Date.now() + WEEK_MS)),
      this.analytics.averageCompletionHours(query),
    ]);
    return {
      scope: scopeName,
      generatedAt: new Date().toISOString(),
      rows: tasks.map((task) => this.toReportRow(task)),
      totals: this.toKpis({
        totalTasks,
        openTasks,
        completedTasks,
        archivedTasks,
        overdueTasks,
        upcomingTasks,
        averageCompletionHours,
      }),
    };
  }

  private async resolveReportScope(
    input: ReportInput,
    userId: Types.ObjectId,
  ): Promise<AnalyticsScopeQuery> {
    const range = this.toRange(input);
    if (input.boardId) {
      const board = await this.boards.findById(input.boardId);
      if (!board) throw new NotFoundError('Board not found');
      await this.requireWorkspaceAccess(board.workspaceId, userId);
      return this.applyReportFilters(
        {
          workspaceId: board.workspaceId,
          projectId: board.projectId,
          boardId: input.boardId,
          ...range,
        },
        input,
      );
    }
    if (input.projectId) {
      const project = await this.projects.findById(input.projectId);
      if (!project) throw new NotFoundError('Project not found');
      await this.requireWorkspaceAccess(project.workspaceId, userId);
      return this.applyReportFilters(
        { workspaceId: project.workspaceId, projectId: input.projectId, ...range },
        input,
      );
    }
    if (input.workspaceId) {
      await this.requireWorkspaceAccess(input.workspaceId, userId);
      return this.applyReportFilters({ workspaceId: input.workspaceId, ...range }, input);
    }
    if (input.userId) {
      if (!input.userId.equals(userId))
        throw new ForbiddenError('You can only export your own cross-workspace user report');
      return this.applyReportFilters({ userId: input.userId, ...range }, input);
    }
    throw new NotFoundError('Report scope not found');
  }

  private applyReportFilters(query: AnalyticsScopeQuery, input: ReportInput): AnalyticsScopeQuery {
    return {
      ...query,
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.search ? { search: input.search } : {}),
    };
  }

  private async requireWorkspaceAccess(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    const [workspace, membership] = await Promise.all([
      this.workspaces.findWorkspaceById(workspaceId),
      this.workspaces.findMembership(workspaceId, userId),
    ]);
    if (!workspace || workspace.archived) throw new NotFoundError('Workspace not found');
    if (!membership || membership.status !== 'active') {
      throw new ForbiddenError('You do not have access to this workspace');
    }
  }

  private toRange(input: DateRangeInput): Pick<AnalyticsScopeQuery, 'from' | 'to'> {
    const range: { from?: Date; to?: Date } = {};
    const from = toDate(input.from);
    const to = toDate(input.to);
    if (from) range.from = from;
    if (to) range.to = to;
    return range;
  }

  private toKpis(input: {
    totalTasks: number;
    openTasks: number;
    completedTasks: number;
    archivedTasks: number;
    overdueTasks: number;
    upcomingTasks: number;
    averageCompletionHours: number;
  }): AnalyticsKpiSummary {
    const completionRate =
      input.totalTasks > 0 ? (input.completedTasks / input.totalTasks) * 100 : 0;
    const overduePercentage =
      input.totalTasks > 0 ? (input.overdueTasks / input.totalTasks) * 100 : 0;
    return {
      totalTasks: input.totalTasks,
      openTasks: input.openTasks,
      completedTasks: input.completedTasks,
      archivedTasks: input.archivedTasks,
      overdueTasks: input.overdueTasks,
      upcomingTasks: input.upcomingTasks,
      completionRate: round(completionRate),
      averageCompletionHours: round(input.averageCompletionHours),
      averageCycleHours: round(input.averageCompletionHours),
      averageLeadHours: round(input.averageCompletionHours),
      overduePercentage: round(overduePercentage),
      velocity: input.completedTasks,
      productivityScore: round(Math.max(0, completionRate - overduePercentage)),
    };
  }

  private normalizeBuckets(buckets: CountBucket[], preserveLabel = false): AnalyticsBucket[] {
    return buckets.map((bucket) => {
      const partial = bucket as CountBucket & { readonly label?: string };
      return {
        key: bucket.key,
        label:
          preserveLabel && partial.label ? partial.label : labelize(partial.label ?? bucket.key),
        value: round(bucket.value),
      };
    });
  }

  private async buildWorkload(
    workspaceId: Types.ObjectId,
    now: Date,
  ): Promise<AnalyticsWorkloadItem[]> {
    const [assigned, overdue, completed] = await Promise.all([
      this.analytics.workload(workspaceId),
      this.analytics.overdueWorkload(workspaceId, now),
      this.analytics.completedWorkload(workspaceId),
    ]);
    const overdueByUser = new Map(overdue.map((item) => [item.key, item.value]));
    const completedByUser = new Map(completed.map((item) => [item.key, item.value]));
    return assigned.map((item) => {
      const utilization = item.value / DEFAULT_CAPACITY;
      const state: AnalyticsWorkloadItem['state'] =
        utilization > 1 ? 'overloaded' : utilization < 0.45 ? 'underutilized' : 'balanced';
      return {
        userId: item.key,
        assignedTasks: item.value,
        completedTasks: completedByUser.get(item.key) ?? 0,
        overdueTasks: overdueByUser.get(item.key) ?? 0,
        capacity: DEFAULT_CAPACITY,
        utilization: round(utilization * 100),
        state,
      };
    });
  }

  private toTaskListItem(task: TaskDocument): AnalyticsTaskListItem {
    return {
      id: task.id,
      title: task.title,
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      assigneeIds: task.assigneeIds.map(idToString),
      dueDate: task.dueDate?.toISOString() ?? null,
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private toReportRow(task: TaskDocument): AnalyticsReportRow {
    return {
      id: task.id,
      title: task.title,
      workspaceId: idToString(task.workspaceId),
      projectId: idToString(task.projectId),
      boardId: idToString(task.boardId),
      columnId: idToString(task.columnId),
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      assigneeIds: task.assigneeIds.map(idToString),
      labels: task.labels,
      dueDate: task.dueDate?.toISOString() ?? null,
      startDate: task.startDate?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private toCsv(report: AnalyticsReportSummary): string {
    const headers = [
      'id',
      'title',
      'workspaceId',
      'projectId',
      'boardId',
      'columnId',
      'status',
      'priority',
      'assigneeIds',
      'labels',
      'dueDate',
      'startDate',
      'createdAt',
      'updatedAt',
    ];
    const escape = (value: string): string => `"${value.replace(/"/g, '""')}"`;
    const rows = report.rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header as keyof AnalyticsReportRow];
          return escape(Array.isArray(value) ? value.join('|') : String(value ?? ''));
        })
        .join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }

  private async toXlsx(report: AnalyticsReportSummary): Promise<Buffer> {
    const headers = [
      'Title',
      'Status',
      'Priority',
      'Assignees',
      'Labels',
      'Due Date',
      'Updated At',
    ];
    const rows = report.rows.map((row) => [
      row.title,
      row.status,
      row.priority,
      row.assigneeIds.join(', '),
      row.labels.join(', '),
      row.dueDate ?? '',
      row.updatedAt,
    ]);
    const worksheetRows = [headers, ...rows]
      .map(
        (cells, rowIndex) =>
          `<row r="${rowIndex + 1}">${cells
            .map(
              (cell, columnIndex) =>
                `<c r="${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t>${escapeXml(
                  String(cell),
                )}</t></is></c>`,
            )
            .join('')}</row>`,
      )
      .join('');
    const files = {
      '[Content_Types].xml': strToU8(
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
      ),
      '_rels/.rels': strToU8(
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      ),
      'xl/workbook.xml': strToU8(
        '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Tasks" sheetId="1" r:id="rId1"/></sheets></workbook>',
      ),
      'xl/_rels/workbook.xml.rels': strToU8(
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      ),
      'xl/worksheets/sheet1.xml': strToU8(
        `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${worksheetRows}</sheetData></worksheet>`,
      ),
    };
    return Buffer.from(zipSync(files));
  }

  private async toPdf(report: AnalyticsReportSummary): Promise<Buffer> {
    return new Promise((resolve) => {
      const document = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.fontSize(20).text('Zenith Analytics Report', { underline: false });
      document.moveDown();
      document.fontSize(11).text(`Scope: ${report.scope}`);
      document.text(`Generated: ${report.generatedAt}`);
      document.text(`Total tasks: ${report.totals.totalTasks}`);
      document.text(`Completion rate: ${report.totals.completionRate}%`);
      document.text(`Overdue tasks: ${report.totals.overdueTasks}`);
      document.moveDown();
      document.fontSize(14).text('Recent Tasks');
      document.moveDown(0.5);
      report.rows.slice(0, 40).forEach((row) => {
        document
          .fontSize(9)
          .text(`${row.title} | ${row.status} | ${row.priority} | ${row.dueDate ?? 'No due date'}`);
      });
      document.end();
    });
  }
}
