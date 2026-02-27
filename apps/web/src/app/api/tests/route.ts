import { getDb } from "@perf-test/db";
import { testRuns } from "@perf-test/db";
import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { createTestSchema } from "@/lib/validation";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";

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

    return successResponse(allTests);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    const validation = validateBody(createTestSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    const [result] = await db
      .insert(testRuns)
      .values({
        name: data.name ?? null,
        scenarioId: data.scenarioId,
        testTypeId: data.testTypeId,
        versionId: data.versionId,
        jmxScriptId: data.jmxScriptId,
        baselineId: data.baselineId ?? null,
        runnerType: data.runnerType,
        runnerConfig: data.runnerConfig,
        userCount: data.userCount,
        durationMinutes: data.durationMinutes,
        rampUpSeconds: data.rampUpSeconds,
        status: "pending",
      })
      .returning();

    return successResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
