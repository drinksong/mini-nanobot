/**
 * Cron service for scheduling agent tasks.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CronJob, CronJobState, CronPayload, CronSchedule, CronStore, ScheduleKind } from './types';

function nowMs(): number {
  return Date.now();
}

function computeNextRun(schedule: CronSchedule, nowMs: number): number | undefined {
  if (schedule.kind === 'at') {
    return schedule.atMs && schedule.atMs > nowMs ? schedule.atMs : undefined;
  }

  if (schedule.kind === 'every') {
    if (!schedule.everyMs || schedule.everyMs <= 0) return undefined;
    return nowMs + schedule.everyMs;
  }

  if (schedule.kind === 'cron' && schedule.expr) {
    // Simplified cron: assume every minute for demo
    // In production, use a cron parser library
    return nowMs + 60000;
  }

  return undefined;
}

export type JobCallback = (job: CronJob) => Promise<string | null>;

export class CronService {
  private store: CronStore = { version: 1, jobs: [] };
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private resolvedStorePath: string;

  constructor(
    storePath: string,
    private onJob?: JobCallback
  ) {
    // 展开 ~ 为实际 home 目录
    if (storePath.startsWith('~')) {
      this.resolvedStorePath = path.join(os.homedir(), storePath.slice(1));
    } else {
      this.resolvedStorePath = storePath;
    }
  }

  /**
   * Load jobs from disk.
   */
  private loadStore(): void {
    try {
      if (fs.existsSync(this.resolvedStorePath)) {
        const data = JSON.parse(fs.readFileSync(this.resolvedStorePath, 'utf-8'));
        this.store = {
          version: data.version || 1,
          jobs: data.jobs || [],
        };
      }
    } catch (error) {
      console.error('Failed to load cron store:', error);
      this.store = { version: 1, jobs: [] };
    }
  }

  /**
   * Save jobs to disk.
   */
  private saveStore(): void {
    try {
      const dir = path.dirname(this.resolvedStorePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.resolvedStorePath, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save cron store:', error);
    }
  }

  /**
   * Start the cron service.
   */
  start(): void {
    this.running = true;
    this.loadStore();
    this.recomputeNextRuns();
    this.saveStore();
    this.armTimer();
    console.log(`⏰ Cron service started with ${this.store.jobs.length} jobs`);
  }

  /**
   * Stop the cron service.
   */
  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('⏰ Cron service stopped');
  }

  /**
   * Recompute next run times for all enabled jobs.
   */
  private recomputeNextRuns(): void {
    const now = nowMs();
    for (const job of this.store.jobs) {
      if (job.enabled && !job.state.nextRunAtMs) {
        job.state.nextRunAtMs = computeNextRun(job.schedule, now);
      }
    }
  }

  /**
   * Get the earliest next run time.
   */
  private getNextWakeMs(): number | undefined {
    const times = this.store.jobs
      .filter(j => j.enabled && j.state.nextRunAtMs)
      .map(j => j.state.nextRunAtMs!);
    return times.length > 0 ? Math.min(...times) : undefined;
  }

  /**
   * Schedule the next timer tick.
   */
  private armTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    const nextWake = this.getNextWakeMs();
    if (!nextWake || !this.running) return;

    const delayMs = Math.max(0, nextWake - nowMs());

    this.timer = setTimeout(() => {
      if (this.running) {
        this.onTimer().catch(console.error);
      }
    }, delayMs);
  }

  /**
   * Handle timer tick - run due jobs.
   */
  private async onTimer(): Promise<void> {
    const now = nowMs();
    const dueJobs = this.store.jobs.filter(
      j => j.enabled && j.state.nextRunAtMs && now >= j.state.nextRunAtMs
    );

    for (const job of dueJobs) {
      await this.executeJob(job);
    }

    this.saveStore();
    this.armTimer();
  }

  /**
   * Execute a single job.
   */
  private async executeJob(job: CronJob): Promise<void> {
    const startMs = nowMs();
    console.log(`⏰ Cron: executing job '${job.name}' (${job.id})`);

    try {
      if (this.onJob) {
        await this.onJob(job);
      }
      job.state.lastStatus = 'ok';
      job.state.lastError = undefined;
      console.log(`⏰ Cron: job '${job.name}' completed`);
    } catch (error) {
      job.state.lastStatus = 'error';
      job.state.lastError = String(error);
      console.error(`⏰ Cron: job '${job.name}' failed:`, error);
    }

    job.state.lastRunAtMs = startMs;
    job.updatedAtMs = nowMs();

    // Handle one-shot jobs
    if (job.schedule.kind === 'at') {
      if (job.deleteAfterRun) {
        this.store.jobs = this.store.jobs.filter(j => j.id !== job.id);
      } else {
        job.enabled = false;
        job.state.nextRunAtMs = undefined;
      }
    } else {
      // Compute next run
      job.state.nextRunAtMs = computeNextRun(job.schedule, nowMs());
    }
  }

  /**
   * List all jobs.
   */
  listJobs(includeDisabled = false): CronJob[] {
    const jobs = includeDisabled
      ? this.store.jobs
      : this.store.jobs.filter(j => j.enabled);
    return jobs.sort((a, b) => (a.state.nextRunAtMs || Infinity) - (b.state.nextRunAtMs || Infinity));
  }

  /**
   * Add a new job.
   */
  addJob(
    name: string,
    schedule: CronSchedule,
    message: string,
    deliver = false,
    channel?: string,
    to?: string,
    deleteAfterRun = false
  ): CronJob {
    const now = nowMs();

    const job: CronJob = {
      id: Math.random().toString(36).substring(2, 10),
      name,
      enabled: true,
      schedule,
      payload: {
        kind: 'agent_turn',
        message,
        deliver,
        channel,
        to,
      },
      state: {
        nextRunAtMs: computeNextRun(schedule, now),
      },
      createdAtMs: now,
      updatedAtMs: now,
      deleteAfterRun,
    };

    this.store.jobs.push(job);
    this.saveStore();
    this.armTimer();

    return job;
  }

  /**
   * Remove a job by ID.
   */
  removeJob(jobId: string): boolean {
    const initialLength = this.store.jobs.length;
    this.store.jobs = this.store.jobs.filter(j => j.id !== jobId);

    if (this.store.jobs.length < initialLength) {
      this.saveStore();
      this.armTimer();
      return true;
    }
    return false;
  }
}
