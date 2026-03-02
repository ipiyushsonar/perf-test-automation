import { NextRequest } from "next/server";
import { getDb, schedules } from "@perf-test/db";
import { desc } from "drizzle-orm";
import { createScheduleSchema } from "@/lib/validation";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { requireAdmin, requireSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const session = requireSession(request);
        if (session instanceof Response) return session;
        const db = getDb();
        const allSchedules = await db
            .select()
            .from(schedules)
            .orderBy(desc(schedules.createdAt));

        return successResponse(allSchedules);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = requireAdmin(request);
        if (session instanceof Response) return session;
        const db = getDb();
        const body = await request.json();

        const validation = validateBody(createScheduleSchema, body);
        if (!validation.success) return validation.response;
        const data = validation.data;

        const [result] = await db
            .insert(schedules)
            .values({
                name: data.name,
                description: data.description,
                cronExpression: data.cronExpression,
                scenarioId: data.scenarioId,
                testTypeId: data.testTypeId,
                versionId: data.versionId,
                jmxScriptId: data.jmxScriptId,
                isActive: data.isActive,
            })
            .returning();

        return successResponse(result, 201);
    } catch (error) {
        return errorResponse(error);
    }
}
