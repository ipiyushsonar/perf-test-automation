import { NextRequest, NextResponse } from "next/server";
import { getExecutor } from "@perf-test/test-runner";
import { requireAdmin, requireSession } from "@/lib/auth";
import { idParamSchema } from "@/lib/validation";
import { validateParams } from "@/lib/api-utils";

export const runtime = "nodejs";

/**
 * GET /api/scripts/[id] — Get a single script by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireSession(_request);
    if (session instanceof NextResponse) return session;
    const { id } = await params;
    const validation = validateParams(idParamSchema, { id });
    if (!validation.success) return validation.response;
    const scriptId = validation.data.id;

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
    const session = requireAdmin(_request);
    if (session instanceof NextResponse) return session;
    const { id } = await params;
    const validation = validateParams(idParamSchema, { id });
    if (!validation.success) return validation.response;
    const scriptId = validation.data.id;

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
