import { getDb } from "@perf-test/db";
import { testRuns } from "@perf-test/db";
import { desc } from "drizzle-orm";
import { NextRequest } from "next/server";
import { createTestSchema, paginationSchema } from "@/lib/validation";
import { validateBody, validateQuery, successResponse, errorResponse } from "@/lib/api-utils";
import { requireSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    if (session instanceof Response) return session;
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const pagination = validateQuery(paginationSchema, searchParams);
    if (!pagination.success) return pagination.response;
    const { limit, offset } = pagination.data;

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
    const session = requireSession(request);
    if (session instanceof Response) return session;
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
        runnerType: data.runnerType ?? "local",
        runnerConfig: data.runnerConfig ?? null,
        userCount: data.userCount,
        durationMinutes: data.durationMinutes,
        rampUpSeconds: data.rampUpSeconds ?? null,
        status: "pending",
        createdBy: session.user,
      })
      .returning();

    return successResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
