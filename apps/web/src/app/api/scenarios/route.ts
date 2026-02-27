import { getDb } from "@perf-test/db";
import { scenarios } from "@perf-test/db";
import { NextRequest } from "next/server";
import { createScenarioSchema } from "@/lib/validation";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  try {
    const db = getDb();
    const allScenarios = await db.select().from(scenarios).orderBy(scenarios.name);
    return successResponse(allScenarios);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    const validation = validateBody(createScenarioSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    const [result] = await db
      .insert(scenarios)
      .values({
        name: data.name,
        displayName: data.displayName,
        description: data.description ?? null,
        testType: data.testType ?? "combined",
        loadUserCount: data.loadUserCount ?? null,
        stressUserCount: data.stressUserCount ?? null,
        durationMinutes: data.durationMinutes ?? 60,
        rampUpSeconds: data.rampUpSeconds ?? 60,
        cooldownSeconds: data.cooldownSeconds ?? 900,
        defaultJmxScriptId: data.defaultJmxScriptId ?? null,
        config: data.config ? JSON.stringify(data.config) : null,
      })
      .returning();

    return successResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
