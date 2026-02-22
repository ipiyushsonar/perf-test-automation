import { EventEmitter } from "events";
import { TestQueue } from "./test-queue";
import { CooldownManager } from "./cooldown";
import type { QueueItem } from "./test-queue";

/**
 * Callback for executing a test. The scheduler calls this when
 * it's time to run the next test from the queue.
 */
export type ExecuteCallback = (testRunId: number) => Promise<void>;

/**
 * Sequential test execution scheduler.
 * Processes the queue one test at a time with configurable cooldown between tests.
 *
 * Flow:
 *   1. Dequeue next test
 *   2. Execute it (via callback)
 *   3. Wait for cooldown
 *   4. Repeat from 1
 */
export class Scheduler extends EventEmitter {
  private queue: TestQueue;
  private cooldown: CooldownManager;
  private executeCallback: ExecuteCallback | null = null;
  private running = false;
  private currentTestRunId: number | null = null;
  private loopPromise: Promise<void> | null = null;

  constructor(queue: TestQueue, cooldown: CooldownManager) {
    super();
    this.queue = queue;
    this.cooldown = cooldown;
  }

  /**
   * Set the callback that will be invoked to execute each test.
   */
  onExecute(callback: ExecuteCallback): void {
    this.executeCallback = callback;
  }

  /**
   * Start the scheduler loop. It will continuously process tests from the queue.
   * If the queue is empty, it waits for new items.
   */
  async start(): Promise<void> {
    if (this.running) return;
    if (!this.executeCallback) {
      throw new Error("No execute callback set. Call onExecute() first.");
    }

    this.running = true;
    this.emit("started");

    this.loopPromise = this.processLoop();
  }

  /**
   * Stop the scheduler. It will finish the current test (if any) but not start new ones.
   */
  stop(): void {
    this.running = false;
    this.cooldown.cancel();
    this.emit("stopped");
  }

  /**
   * The main processing loop.
   */
  private async processLoop(): Promise<void> {
    while (this.running) {
      // Check if there's a test to process
      const item = this.queue.dequeue();

      if (!item) {
        // Queue is empty — wait a bit and check again
        await this.sleep(2000);
        continue;
      }

      // Execute the test
      this.currentTestRunId = item.testRunId;
      this.queue.isProcessing = true;

      this.emit("testStarting", { testRunId: item.testRunId });

      try {
        await this.executeCallback!(item.testRunId);
        this.emit("testCompleted", { testRunId: item.testRunId });
      } catch (err) {
        this.emit("testFailed", {
          testRunId: item.testRunId,
          error: String(err),
        });
      }

      this.currentTestRunId = null;
      this.queue.isProcessing = false;

      // Only apply cooldown if there are more tests waiting and we're still running
      if (this.running && !this.queue.isEmpty) {
        this.emit("cooldownStarting", {
          durationSeconds: this.cooldown.remainingSeconds,
          nextTestRunId: this.queue.peek()?.testRunId,
        });

        await this.cooldown.start();
      }
    }
  }

  /**
   * Get the current scheduler status.
   */
  getStatus(): SchedulerStatus {
    return {
      isRunning: this.running,
      currentTestRunId: this.currentTestRunId,
      queueLength: this.queue.length,
      isProcessing: this.queue.isProcessing,
      cooldown: this.cooldown.getStatus(),
    };
  }

  /**
   * Helper to sleep for a duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export interface SchedulerStatus {
  isRunning: boolean;
  currentTestRunId: number | null;
  queueLength: number;
  isProcessing: boolean;
  cooldown: {
    isActive: boolean;
    remainingSeconds: number;
    endsAt: Date | null;
    defaultDurationSeconds: number;
  };
}
