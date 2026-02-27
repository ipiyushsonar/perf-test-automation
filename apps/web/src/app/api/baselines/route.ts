import { NextRequest } from "next/server";
import { getDb, baselines } from "@perf-test/db";
import { desc } from "drizzle-orm";
import { createBaselineSchema } from "@/lib/validation";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
    try {
        const db = getDb();
        const allBaselines = await db
            .select()
            .from(baselines)
            .orderBy(desc(baselines.createdAt));

        return successResponse(allBaselines);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const body = await request.json();

        const validation = validateBody(createBaselineSchema, body);
        if (!validation.success) return validation.response;
        const data = validation.data;

        const [result] = await db
            .insert(baselines)
            .values({
                name: data.name,
                description: data.description,
                scenarioId: data.scenarioId,
                testTypeId: data.testTypeId,
                versionId: data.versionId,
                sourceTestRunId: data.sourceTestRunId ?? null,
            })
            .returning();

        return successResponse(result, 201);
    } catch (error) {
        return errorResponse(error);
    }
}
