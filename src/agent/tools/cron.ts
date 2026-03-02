/**
 * Cron tool for scheduling reminders and tasks.
 */

import { Tool, ToolParams } from './base';
import { CronService } from '../../cron/service';
import { CronSchedule } from '../../cron/types';

export class CronTool extends Tool {
  private channel = '';
  private chatId = '';

  constructor(private cron: CronService) {
    super();
  }

  setContext(channel: string, chatId: string): void {
    this.channel = channel;
    this.chatId = chatId;
  }

  get name(): string {
    return 'cron';
  }

  get description(): string {
    return 'Schedule reminders and recurring tasks. Actions: add, list, remove.';
  }

  get parameters(): { type: string; properties: Record<string, any>; required: string[] } {
    return {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['add', 'list', 'remove'],
          description: 'Action to perform',
        },
        message: {
          type: 'string',
          description: 'Reminder message (for add)',
        },
        every_seconds: {
          type: 'integer',
          description: 'Interval in seconds (for recurring tasks)',
        },
        cron_expr: {
          type: 'string',
          description: "Cron expression like '0 9 * * *' (for scheduled tasks)",
        },
        tz: {
          type: 'string',
          description: "IANA timezone for cron expressions (e.g. 'America/Vancouver')",
        },
        at: {
          type: 'string',
          description: "ISO datetime for one-time execution (e.g. '2026-02-12T10:30:00')",
        },
        job_id: {
          type: 'string',
          description: 'Job ID (for remove)',
        },
      },
      required: ['action'],
    };
  }

  async execute(params: ToolParams): Promise<string> {
    const action = params.action as string;

    switch (action) {
      case 'add':
        return this.addJob(params);
      case 'list':
        return this.listJobs();
      case 'remove':
        return this.removeJob(params.job_id as string);
      default:
        return `Unknown action: ${action}`;
    }
  }

  private addJob(params: ToolParams): string {
    const message = params.message as string;
    const everySeconds = params.every_seconds as number | undefined;
    const cronExpr = params.cron_expr as string | undefined;
    const tz = params.tz as string | undefined;
    const at = params.at as string | undefined;

    if (!message) {
      return 'Error: message is required for add';
    }
    if (!this.channel || !this.chatId) {
      return 'Error: no session context (channel/chat_id)';
    }
    if (tz && !cronExpr) {
      return 'Error: tz can only be used with cron_expr';
    }

    // Build schedule
    let deleteAfter = false;
    let schedule: CronSchedule;

    if (everySeconds) {
      schedule = { kind: 'every', everyMs: everySeconds * 1000 };
    } else if (cronExpr) {
      schedule = { kind: 'cron', expr: cronExpr, tz };
    } else if (at) {
      const date = new Date(at);
      if (isNaN(date.getTime())) {
        return 'Error: invalid at datetime format';
      }
      schedule = { kind: 'at', atMs: date.getTime() };
      deleteAfter = true;
    } else {
      return 'Error: either every_seconds, cron_expr, or at is required';
    }

    const job = this.cron.addJob(
      message.slice(0, 30),
      schedule,
      message,
      true,
      this.channel,
      this.chatId,
      deleteAfter
    );

    return `Created job '${job.name}' (id: ${job.id})`;
  }

  private listJobs(): string {
    const jobs = this.cron.listJobs();
    if (jobs.length === 0) {
      return 'No scheduled jobs.';
    }

    const lines = jobs.map(j => {
      let scheduleStr: string = j.schedule.kind;
      if (j.schedule.everyMs) {
        scheduleStr = `every ${j.schedule.everyMs / 1000}s`;
      } else if (j.schedule.expr) {
        scheduleStr = `cron "${j.schedule.expr}"`;
      } else if (j.schedule.atMs) {
        scheduleStr = `at ${new Date(j.schedule.atMs).toISOString()}`;
      }
      return `- ${j.name} (id: ${j.id}, ${scheduleStr})`;
    });

    return 'Scheduled jobs:\n' + lines.join('\n');
  }

  private removeJob(jobId: string | undefined): string {
    if (!jobId) {
      return 'Error: job_id is required for remove';
    }
    if (this.cron.removeJob(jobId)) {
      return `Removed job ${jobId}`;
    }
    return `Job ${jobId} not found`;
  }
}
