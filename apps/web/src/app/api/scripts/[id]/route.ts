import { NextRequest, NextResponse } from "next/server";
import { getExecutor } from "@perf-test/test-runner";

export const runtime = "nodejs";

/**
 * GET /api/scripts/[id] — Get a single script by ID
 */
export async function GET(
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

    const executor = getExecutor();
    const scriptManager = executor.getScriptManager();
    const script = await scriptManager.getById(scriptId);

    if (!script) {
      return NextResponse.json(
        { success: false, error: "Script not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: script });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scripts/[id] — Delete a script by ID
 */
export async function DELETE(
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

    const executor = getExecutor();
    const scriptManager = executor.getScriptManager();
    const deleted = await scriptManager.delete(scriptId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Script not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
