// server/durableScheduler.ts
// Durable Backend Scheduler & Refresh Cadence Engine for ApplyVise AI 2.0
// Features Priority Queues, In-Process Mutex Distributed Locking, Adaptive Backoff, and Dead-Letter Queue (DLQ).

import { globalSourceRegistry, JobSourceAdapter } from './sourceAdapters/index.ts';
import { deduplicateJobs, verifyJobFreshness } from './jobQualityEngine.ts';
import { authAndStore } from './authAndStore.ts';
import { processHrDiscoveryQueueBatch } from './hrDiscoveryEngine.ts';

export type TaskPriority = 'high' | 'standard' | 'deep' | 'maintenance';

export interface ScheduledTask {
  id: string;
  name: string;
  priority: TaskPriority;
  intervalMs: number;
  lastRunAt?: string;
  lastSuccessAt?: string;
  nextRunAt: string;
  consecutiveFailures: number;
  status: 'idle' | 'running' | 'backoff' | 'dead_letter';
  lastError?: string;
  execute: () => Promise<{ itemsProcessed: number; itemsAccepted: number; details?: any }>;
}

export interface DeadLetterEntry {
  taskId: string;
  name: string;
  failedAt: string;
  consecutiveFailures: number;
  lastError: string;
}

export class DurableScheduler {
  private tasks = new Map<string, ScheduledTask>();
  private activeLocks = new Set<string>();
  private deadLetterQueue: DeadLetterEntry[] = [];
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private maxConsecutiveFailures = 5;

  constructor() {
    this.registerDefaultTasks();
  }

  private registerDefaultTasks(): void {
    // 1. High Priority: ATS Board Sync (every 20 minutes)
    this.registerTask({
      id: 'task_ats_sync',
      name: 'Primary ATS Boards Synchronization',
      priority: 'high',
      intervalMs: 20 * 60 * 1000, // 20m
      nextRunAt: new Date(Date.now() + 60 * 1000).toISOString(), // start in 1m
      consecutiveFailures: 0,
      status: 'idle',
      execute: async () => {
        const atsAdapters = globalSourceRegistry.getAdaptersByCategory('ats');
        const res = await globalSourceRegistry.fetchAll({
          sourceIds: atsAdapters.map((a) => a.id),
          maxConcurrent: 4,
        });

        if (res.jobs.length > 0) {
          const { uniqueJobs } = deduplicateJobs(res.jobs);
          authAndStore.saveVacancies(uniqueJobs);
        }

        return { itemsProcessed: res.totalFetched, itemsAccepted: res.totalAccepted };
      },
    });

    // 2. Standard Priority: Global Marketplace Feed Sync (every 60 minutes)
    this.registerTask({
      id: 'task_marketplace_sync',
      name: 'Global Marketplace Aggregator Sync',
      priority: 'standard',
      intervalMs: 60 * 60 * 1000, // 1h
      nextRunAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      consecutiveFailures: 0,
      status: 'idle',
      execute: async () => {
        const marketAdapters = globalSourceRegistry.getAdaptersByCategory('marketplace');
        const res = await globalSourceRegistry.fetchAll({
          sourceIds: marketAdapters.map((a) => a.id),
          maxConcurrent: 3,
        });

        if (res.jobs.length > 0) {
          const { uniqueJobs } = deduplicateJobs(res.jobs);
          authAndStore.saveVacancies(uniqueJobs);
        }

        return { itemsProcessed: res.totalFetched, itemsAccepted: res.totalAccepted };
      },
    });

    // 3. Maintenance Priority: Expired Job Cleanup & Closure Verification (every 2 hours)
    this.registerTask({
      id: 'task_closure_cleanup',
      name: 'Vacancy Closure & Freshness Probe Verification',
      priority: 'maintenance',
      intervalMs: 2 * 60 * 60 * 1000, // 2h
      nextRunAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      consecutiveFailures: 0,
      status: 'idle',
      execute: async () => {
        const vacancies = authAndStore.getVacancies(50);
        let checked = 0;
        let closedCount = 0;

        for (const v of vacancies) {
          if (!v.url) continue;
          checked++;
          try {
            const probe = await verifyJobFreshness(v.url, 4000);
            if (!probe.isActive) {
              closedCount++;
              v.isActive = false;
              v.status = 'closed';
            }
            v.lastCheckedAt = probe.checkedAt;
          } catch {
            // Ignore single network check errors
          }
          if (checked >= 20) break; // Check up to 20 per cycle to conserve bandwidth
        }

        return { itemsProcessed: checked, itemsAccepted: checked - closedCount, details: { closedDetected: closedCount } };
      },
    });

    // 4. Maintenance Priority: HR Contact Discovery Queue Processor (every 30 minutes)
    this.registerTask({
      id: 'task_hr_discovery_queue',
      name: 'HR Recruiter Contact Discovery Queue',
      priority: 'standard',
      intervalMs: 30 * 60 * 1000, // 30m
      nextRunAt: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
      consecutiveFailures: 0,
      status: 'idle',
      execute: async () => {
        try {
          const res = await processHrDiscoveryQueueBatch({
            triggeredBy: 'system_scheduler',
            triggerType: 'scheduled',
            batchLimit: 25,
            fetchBudget: 3,
          });
          return { itemsProcessed: res.processed, itemsAccepted: res.contactsDiscovered };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { itemsProcessed: 0, itemsAccepted: 0, details: { error: msg } };
        }
      },
    });
  }

  public registerTask(task: ScheduledTask): void {
    this.tasks.set(task.id, task);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    // Tick every 15 seconds to evaluate queues
    this.timer = setInterval(() => this.tick(), 15000);
    this.tick();
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  public async triggerTask(taskId: string): Promise<{ success: boolean; message: string; result?: any }> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return { success: false, message: `Task ${taskId} not found.` };
    }
    if (this.activeLocks.has(taskId)) {
      return { success: false, message: `Task ${taskId} is currently executing.` };
    }

    try {
      this.activeLocks.add(taskId);
      task.status = 'running';
      task.lastRunAt = new Date().toISOString();

      const res = await task.execute();

      task.consecutiveFailures = 0;
      task.status = 'idle';
      task.lastSuccessAt = new Date().toISOString();
      task.nextRunAt = new Date(Date.now() + task.intervalMs).toISOString();

      return { success: true, message: 'Execution succeeded', result: res };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      task.lastError = msg;
      task.consecutiveFailures++;
      task.status = 'idle';
      return { success: false, message: `Execution failed: ${msg}` };
    } finally {
      this.activeLocks.delete(taskId);
    }
  }

  private async tick(): Promise<void> {
    const now = Date.now();
    const sortedTasks = Array.from(this.tasks.values()).sort((a, b) => {
      // Prioritize high > standard > maintenance
      const rank = { high: 0, standard: 1, deep: 2, maintenance: 3 };
      return rank[a.priority] - rank[b.priority];
    });

    for (const task of sortedTasks) {
      if (task.status === 'dead_letter') continue;
      if (this.activeLocks.has(task.id)) continue;

      const nextRunTime = Date.parse(task.nextRunAt);
      if (Number.isNaN(nextRunTime) || now >= nextRunTime) {
        // Run task under lock
        this.runTaskLocked(task);
      }
    }
  }

  private async runTaskLocked(task: ScheduledTask): Promise<void> {
    this.activeLocks.add(task.id);
    task.status = 'running';
    task.lastRunAt = new Date().toISOString();

    try {
      const res = await task.execute();

      task.consecutiveFailures = 0;
      task.status = 'idle';
      task.lastSuccessAt = new Date().toISOString();
      task.nextRunAt = new Date(Date.now() + task.intervalMs).toISOString();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      task.lastError = msg;
      task.consecutiveFailures++;

      if (task.consecutiveFailures >= this.maxConsecutiveFailures) {
        task.status = 'dead_letter';
        this.deadLetterQueue.push({
          taskId: task.id,
          name: task.name,
          failedAt: new Date().toISOString(),
          consecutiveFailures: task.consecutiveFailures,
          lastError: msg,
        });
      } else {
        // Adaptive exponential backoff: intervalMs * 2^(failures) capped at 24h
        const backoffMs = Math.min(task.intervalMs * Math.pow(2, task.consecutiveFailures), 24 * 60 * 60 * 1000);
        task.status = 'backoff';
        task.nextRunAt = new Date(Date.now() + backoffMs).toISOString();
      }
    } finally {
      this.activeLocks.delete(task.id);
    }
  }

  public getStatus(): {
    isRunning: boolean;
    activeLocks: string[];
    tasks: Array<{
      id: string;
      name: string;
      priority: TaskPriority;
      status: string;
      intervalMinutes: number;
      lastRunAt?: string;
      lastSuccessAt?: string;
      nextRunAt: string;
      consecutiveFailures: number;
      lastError?: string;
    }>;
    deadLetterQueue: DeadLetterEntry[];
  } {
    return {
      isRunning: this.isRunning,
      activeLocks: Array.from(this.activeLocks),
      tasks: Array.from(this.tasks.values()).map((t) => ({
        id: t.id,
        name: t.name,
        priority: t.priority,
        status: t.status,
        intervalMinutes: Math.round(t.intervalMs / 60000),
        lastRunAt: t.lastRunAt,
        lastSuccessAt: t.lastSuccessAt,
        nextRunAt: t.nextRunAt,
        consecutiveFailures: t.consecutiveFailures,
        lastError: t.lastError,
      })),
      deadLetterQueue: [...this.deadLetterQueue],
    };
  }
}

// Global Durable Scheduler singleton
export const durableScheduler = new DurableScheduler();
