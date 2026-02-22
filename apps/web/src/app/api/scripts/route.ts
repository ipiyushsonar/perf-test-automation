import { getDb, jmxScripts } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getExecutor } from "@perf-test/test-runner";

/**
 * GET /api/scripts — List all JMX scripts
 * Query params: ?scenarioId=1
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get("scenarioId");

    const executor = getExecutor();
    const scriptManager = executor.getScriptManager();

    const scripts = await scriptManager.list(
      scenarioId ? parseInt(scenarioId, 10) : undefined
    );

    return NextResponse.json({ success: true, data: scripts });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scripts — Upload a JMX script
 * Accepts multipart/form-data with a 'file' field and optional metadata.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided. Use multipart/form-data with a 'file' field." },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".jmx")) {
      return NextResponse.json(
        { success: false, error: "Only .jmx files are accepted" },
        { status: 400 }
      );
    }

    const name = (formData.get("name") as string) || undefined;
    const description = (formData.get("description") as string) || undefined;
    const scenarioIdStr = formData.get("scenarioId") as string;
    const scenarioId = scenarioIdStr ? parseInt(scenarioIdStr, 10) : undefined;
    const isDefault = formData.get("isDefault") === "true";

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const executor = getExecutor();
    const scriptManager = executor.getScriptManager();

    const result = await scriptManager.uploadFromBuffer(buffer, file.name, {
      name,
      description,
      scenarioId,
      isDefault,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
