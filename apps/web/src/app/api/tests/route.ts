import { getDb } from "@perf-test/db";
import { testRuns } from "@perf-test/db";
import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const allTests = await db
      .select()
      .from(testRuns)
      .orderBy(desc(testRuns.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ success: true, data: allTests });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    const [result] = await db
      .insert(testRuns)
      .values({
        name: body.name,
        scenarioId: body.scenarioId,
        testTypeId: body.testTypeId,
        versionId: body.versionId,
        jmxScriptId: body.jmxScriptId,
        baselineId: body.baselineId,
        runnerType: body.runnerType || "local",
        runnerConfig: body.runnerConfig,
        userCount: body.userCount,
        durationMinutes: body.durationMinutes,
        rampUpSeconds: body.rampUpSeconds,
        status: "pending",
      })
      .returning();

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
