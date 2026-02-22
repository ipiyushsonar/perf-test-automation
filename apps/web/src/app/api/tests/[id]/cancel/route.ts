import { getDb, testRuns } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getExecutor } from "@perf-test/test-runner";

/**
 * POST /api/tests/[id]/cancel — Cancel a queued or running test
 */
export async function POST(
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

    // Verify the test exists
    const db = getDb();
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

    if (!["queued", "running"].includes(testRun.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot cancel test in '${testRun.status}' status. Only 'queued' or 'running' tests can be cancelled.`,
        },
        { status: 409 }
      );
    }

    // Cancel the test
    const executor = getExecutor();
    await executor.cancelTest(testRunId);

    return NextResponse.json({
      success: true,
      data: {
        testRunId,
        status: "cancelled",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
