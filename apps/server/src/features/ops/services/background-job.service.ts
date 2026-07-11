import { BackgroundJobRepository } from '../repositories/ops.repository.js';
import type { EnqueueJobInput, ListJobsQuery } from '../validation/ops.validation.js';
import { logger } from '../../../utils/logger.js';
import type { BackgroundJobDocument } from '../models/background-job.model.js';
import { auditLogService } from './audit-log.service.js';

export class BackgroundJobService {
  private running = false;
  private timer: NodeJS.Timeout | null = null;

  public constructor(private readonly jobs = new BackgroundJobRepository()) {}

  public async enqueue(input: EnqueueJobInput): Promise<unknown> {
    const job = await this.jobs.enqueue({
      type: input.type,
      payload: input.payload,
      maxAttempts: input.maxAttempts,
      ...(input.runAt ? { runAt: new Date(input.runAt) } : {}),
    });
    await auditLogService.record({
      targetType: 'background_job',
      targetId: job.id,
      action: 'background_job.queued',
      metadata: { type: job.type },
    });
    return this.toSummary(job);
  }

  public async list(query: ListJobsQuery): Promise<unknown> {
    const result = await this.jobs.list({
      page: query.page,
      limit: query.limit,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
    });
    return {
      items: result.items.map((job) => this.toSummary(job)),
      page: query.page,
      limit: query.limit,
      total: result.total,
      hasMore: query.page * query.limit < result.total,
    };
  }

  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.processDue(), 10_000);
  }

  public stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  public status(): { running: boolean; polling: boolean } {
    return { running: this.running, polling: this.timer !== null };
  }

  public async processDue(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const jobs = await this.jobs.claimDue(10);
      await Promise.all(
        jobs.map(async (job) => {
          try {
            logger.info('Background job processed', { jobId: job.id, type: job.type });
            await this.jobs.complete(job._id);
          } catch (error) {
            await this.jobs.fail(job, error instanceof Error ? error.message : 'Job failed');
          }
        }),
      );
    } finally {
      this.running = false;
    }
  }

  private toSummary(job: BackgroundJobDocument): Record<string, unknown> {
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      runAt: job.runAt.toISOString(),
      finishedAt: job.finishedAt?.toISOString() ?? null,
      error: job.error ?? null,
      payload: job.payload,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}

export const backgroundJobService = new BackgroundJobService();
