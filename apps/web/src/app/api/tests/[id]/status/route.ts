import { getDb, testRuns, testStatistics } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getExecutor } from "@perf-test/test-runner";

/**
 * GET /api/tests/[id]/status — Get detailed status of a test run
 * Includes queue position, cooldown info, and executor status.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const testRunId = parseInt(id, 10);

    if (isNaN(testRunId)) {
      return NextResponse.json(
        { success: false, error: "Invalid test run ID" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get the test run
    const [testRun] = await db
      .select()
      .from(testRuns)
      .where(eq(testRuns.id, testRunId))
      .limit(1);

    if (!testRun) {
      return NextResponse.json(
        { success: false, error: "Test run not found" },
        { status: 404 }
      );
    }

    // Build response with additional runtime info
    const executor = getExecutor();
    const executorStatus = executor.getStatus();
    const queue = executor.getQueue();

    const response: Record<string, unknown> = {
      ...testRun,
    };

    // Add queue position if queued
    if (testRun.status === "queued") {
      response.queuePosition = queue.getPosition(testRunId);
      response.queueLength = queue.length;
    }

    // Add cooldown info if in cooldown phase
    if (executorStatus.scheduler.cooldown.isActive) {
      response.cooldown = executorStatus.scheduler.cooldown;
    }

    // Add per-transaction statistics if completed
    if (testRun.status === "completed") {
      const stats = await db
        .select()
        .from(testStatistics)
        .where(eq(testStatistics.testRunId, testRunId))
        .orderBy(testStatistics.transactionName);

      response.statistics = stats;
    }

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
