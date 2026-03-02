import { NextRequest } from "next/server";
import { getDb, schedules } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { updateScheduleSchema } from "@/lib/validation";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { requireAdmin, requireSession } from "@/lib/auth";
import { idParamSchema } from "@/lib/validation";
import { validateParams } from "@/lib/api-utils";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = requireSession(request);
        if (session instanceof Response) return session;
        const { id } = await params;
        const validation = validateParams(idParamSchema, { id });
        if (!validation.success) return validation.response;
        const db = getDb();
        const [schedule] = await db
            .select()
            .from(schedules)
            .where(eq(schedules.id, validation.data.id))
            .limit(1);

        if (!schedule) {
            return errorResponse("Schedule not found", 404);
        }

        return successResponse(schedule);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = requireAdmin(request);
        if (session instanceof Response) return session;
        const { id } = await params;
        const idValidation = validateParams(idParamSchema, { id });
        if (!idValidation.success) return idValidation.response;
        const db = getDb();
        const body = await request.json();

        const validation = validateBody(updateScheduleSchema, body);
        if (!validation.success) return validation.response;
        const data = validation.data;

        const [result] = await db
            .update(schedules)
            .set({
                name: data.name,
                description: data.description,
                cronExpression: data.cronExpression,
                scenarioId: data.scenarioId,
                testTypeId: data.testTypeId,
                versionId: data.versionId,
                jmxScriptId: data.jmxScriptId,
                isActive: data.isActive,
            })
            .where(eq(schedules.id, idValidation.data.id))
            .returning();

        if (!result) {
            return errorResponse("Schedule not found", 404);
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
        const session = requireAdmin(request);
        if (session instanceof Response) return session;
        const { id } = await params;
        const validation = validateParams(idParamSchema, { id });
        if (!validation.success) return validation.response;
        const db = getDb();

        const [deleted] = await db
            .delete(schedules)
            .where(eq(schedules.id, validation.data.id))
            .returning();

        if (!deleted) {
            return errorResponse("Schedule not found", 404);
        }

        return successResponse({ message: "Schedule deleted" });
    } catch (error) {
        return errorResponse(error);
    }
}
