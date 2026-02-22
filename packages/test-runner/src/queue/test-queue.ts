import { EventEmitter } from "events";
import { getDb, testRuns } from "@perf-test/db";
import { eq, and, inArray } from "drizzle-orm";

/**
 * Represents an item in the test queue.
 */
export interface QueueItem {
  testRunId: number;
  priority: number; // lower = higher priority
  addedAt: Date;
}

/**
 * In-memory test queue backed by SQLite persistence.
 * Tests are queued in memory for fast access, but their status
 * is persisted in the test_runs table (status = 'queued').
 *
 * The queue processes tests sequentially — only one test runs at a time.
 */
export class TestQueue extends EventEmitter {
  private items: QueueItem[] = [];
  private _isProcessing = false;

  /**
   * Initialize the queue by loading any previously queued tests from the database.
   * This handles restart recovery — if the server restarts mid-queue,
   * previously queued tests are restored.
   */
  async restore(): Promise<void> {
    const db = getDb();
    const queuedTests = await db
      .select({ id: testRuns.id, queuedAt: testRuns.queuedAt })
      .from(testRuns)
      .where(eq(testRuns.status, "queued"));

    // Restore queue items sorted by queuedAt
    this.items = queuedTests
      .map((t) => ({
        testRunId: t.id,
        priority: 0,
        addedAt: t.queuedAt ? new Date(t.queuedAt) : new Date(),
      }))
      .sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime());

    if (this.items.length > 0) {
      this.emit("restored", { count: this.items.length });
    }

    // Also check for any tests stuck in 'running' status (from a crash)
    const stuckTests = await db
      .select({ id: testRuns.id })
      .from(testRuns)
      .where(eq(testRuns.status, "running"));

    if (stuckTests.length > 0) {
      // Mark stuck tests as failed
      for (const t of stuckTests) {
        await db
          .update(testRuns)
          .set({
            status: "failed",
            errorLog: "Server restarted while test was running",
            completedAt: new Date(),
          })
          .where(eq(testRuns.id, t.id));
      }
      this.emit("recovered", {
        failedCount: stuckTests.length,
        ids: stuckTests.map((t) => t.id),
      });
    }
  }

  /**
   * Add a test run to the queue.
   * Updates the test_runs DB record to status='queued'.
   */
  async enqueue(testRunId: number, priority = 0): Promise<QueueItem> {
    const db = getDb();

    // Update DB status to queued
    await db
      .update(testRuns)
      .set({
        status: "queued",
        queuedAt: new Date(),
      })
      .where(eq(testRuns.id, testRunId));

    const item: QueueItem = {
      testRunId,
      priority,
      addedAt: new Date(),
    };

    // Insert in priority order (lower priority number = higher priority)
    const insertIndex = this.items.findIndex((i) => i.priority > priority);
    if (insertIndex === -1) {
      this.items.push(item);
    } else {
      this.items.splice(insertIndex, 0, item);
    }

    this.emit("enqueued", { testRunId, position: this.items.indexOf(item) + 1 });
    return item;
  }

  /**
   * Remove the next item from the queue (FIFO within same priority).
   */
  dequeue(): QueueItem | undefined {
    const item = this.items.shift();
    if (item) {
      this.emit("dequeued", { testRunId: item.testRunId });
    }
    return item;
  }

  /**
   * Remove a specific test from the queue by testRunId.
   * Updates the DB status back to 'cancelled'.
   */
  async remove(testRunId: number): Promise<boolean> {
    const index = this.items.findIndex((i) => i.testRunId === testRunId);
    if (index === -1) return false;

    this.items.splice(index, 1);

    const db = getDb();
    await db
      .update(testRuns)
      .set({ status: "cancelled", completedAt: new Date() })
      .where(eq(testRuns.id, testRunId));

    this.emit("removed", { testRunId });
    return true;
  }

  /**
   * Peek at the next item without removing it.
   */
  peek(): QueueItem | undefined {
    return this.items[0];
  }

  /**
   * Get all items in the queue.
   */
  getAll(): ReadonlyArray<QueueItem> {
    return [...this.items];
  }

  /**
   * Get the position of a test in the queue (1-indexed).
   * Returns -1 if not found.
   */
  getPosition(testRunId: number): number {
    const index = this.items.findIndex((i) => i.testRunId === testRunId);
    return index === -1 ? -1 : index + 1;
  }

  /**
   * Get the number of items in the queue.
   */
  get length(): number {
    return this.items.length;
  }

  /**
   * Check if the queue is empty.
   */
  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Whether the queue is currently being processed (a test is running).
   */
  get isProcessing(): boolean {
    return this._isProcessing;
  }

  set isProcessing(value: boolean) {
    this._isProcessing = value;
  }

  /**
   * Clear the entire queue (marks all queued tests as cancelled in DB).
   */
  async clear(): Promise<number> {
    const count = this.items.length;
    const testRunIds = this.items.map((i) => i.testRunId);

    if (testRunIds.length > 0) {
      const db = getDb();
      await db
        .update(testRuns)
        .set({ status: "cancelled", completedAt: new Date() })
        .where(inArray(testRuns.id, testRunIds));
    }

    this.items = [];
    this.emit("cleared", { count });
    return count;
  }
}
