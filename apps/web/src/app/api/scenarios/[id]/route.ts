import { NextRequest } from "next/server";
import { getDb, scenarios } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { updateScenarioSchema } from "@/lib/validation";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = getDb();
        const [scenario] = await db
            .select()
            .from(scenarios)
            .where(eq(scenarios.id, Number(id)))
            .limit(1);

        if (!scenario) {
            return errorResponse("Scenario not found", 404);
        }

        return successResponse(scenario);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = getDb();
        const body = await request.json();

        const validation = validateBody(updateScenarioSchema, body);
        if (!validation.success) return validation.response;
        const data = validation.data;

        const [result] = await db
            .update(scenarios)
            .set({
                name: data.name,
                displayName: data.displayName,
                description: data.description,
                testType: data.testType,
                loadUserCount: data.loadUserCount,
                stressUserCount: data.stressUserCount,
                durationMinutes: data.durationMinutes,
                rampUpSeconds: data.rampUpSeconds,
                cooldownSeconds: data.cooldownSeconds,
                defaultJmxScriptId: data.defaultJmxScriptId,
                config: data.config,
            })
            .where(eq(scenarios.id, Number(id)))
            .returning();

        if (!result) {
            return errorResponse("Scenario not found", 404);
        }

        return successResponse(result);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = getDb();

        const [deleted] = await db
            .delete(scenarios)
            .where(eq(scenarios.id, Number(id)))
            .returning();

        if (!deleted) {
            return errorResponse("Scenario not found", 404);
        }

        return successResponse({ message: "Scenario deleted" });
    } catch (error) {
        return errorResponse(error);
    }
}
