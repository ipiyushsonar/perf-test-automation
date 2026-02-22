import { NextRequest, NextResponse } from "next/server";
import { getExecutor, JmxValidator } from "@perf-test/test-runner";

export const runtime = "nodejs";

/**
 * POST /api/scripts/[id]/validate — Validate a JMX script
 * Returns structural validation results (ThreadGroups, listeners, etc.)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scriptId = parseInt(id, 10);

    if (isNaN(scriptId)) {
      return NextResponse.json(
        { success: false, error: "Invalid script ID" },
        { status: 400 }
      );
    }

    // Get the script path
    const executor = getExecutor();
    const scriptManager = executor.getScriptManager();
    const scriptPath = await scriptManager.getScriptPath(scriptId);

    if (!scriptPath) {
      return NextResponse.json(
        { success: false, error: "Script not found" },
        { status: 404 }
      );
    }

    // Validate
    const validator = new JmxValidator();
    const result = await validator.validate(scriptPath);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
