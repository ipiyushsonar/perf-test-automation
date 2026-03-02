import { getDb, testRuns } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getExecutor } from "@perf-test/test-runner";
import { requireSession } from "@/lib/auth";
import { idParamSchema } from "@/lib/validation";
import { validateParams } from "@/lib/api-utils";

export const runtime = "nodejs";

/**
 * POST /api/tests/[id]/start — Queue a test run for execution
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const validation = validateParams(idParamSchema, { id });
    if (!validation.success) return validation.response;
    const testRunId = validation.data.id;

    const session = requireSession(_request);
    if (session instanceof NextResponse) return session;

    // Verify the test exists and is in a valid state to start
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

    if (testRun.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot start test in '${testRun.status}' status. Only 'pending' tests can be started.`,
        },
        { status: 409 }
      );
    }

    // Queue the test
    const executor = getExecutor();
    const { position } = await executor.queueTest(testRunId);

    return NextResponse.json({
      success: true,
      data: {
        testRunId,
        status: "queued",
        queuePosition: position,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
