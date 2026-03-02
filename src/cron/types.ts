/**
 * Cron types for scheduled tasks.
 */

export type ScheduleKind = 'at' | 'every' | 'cron';
export type JobStatus = 'ok' | 'error' | 'skipped';

export interface CronSchedule {
  kind: ScheduleKind;
  atMs?: number;        // For "at": timestamp in ms
  everyMs?: number;     // For "every": interval in ms
  expr?: string;        // For "cron": cron expression
  tz?: string;          // Timezone for cron expressions
}

export interface CronPayload {
  kind: 'system_event' | 'agent_turn';
  message: string;
  deliver: boolean;
  channel?: string;
  to?: string;
}

export interface CronJobState {
  nextRunAtMs?: number;
  lastRunAtMs?: number;
  lastStatus?: JobStatus;
  lastError?: string;
}

export interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: CronSchedule;
  payload: CronPayload;
  state: CronJobState;
  createdAtMs: number;
  updatedAtMs: number;
  deleteAfterRun: boolean;
}

export interface CronStore {
  version: number;
  jobs: CronJob[];
}
