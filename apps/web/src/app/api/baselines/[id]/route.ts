import { NextRequest } from "next/server";
import { getDb, baselines } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { updateBaselineSchema } from "@/lib/validation";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = getDb();
        const [baseline] = await db
            .select()
            .from(baselines)
            .where(eq(baselines.id, Number(id)))
            .limit(1);

        if (!baseline) {
            return errorResponse("Baseline not found", 404);
        }

        return successResponse(baseline);
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

        const validation = validateBody(updateBaselineSchema, body);
        if (!validation.success) return validation.response;
        const data = validation.data;

        const [result] = await db
            .update(baselines)
            .set({
                name: data.name,
                description: data.description,
            })
            .where(eq(baselines.id, Number(id)))
            .returning();

        if (!result) {
            return errorResponse("Baseline not found", 404);
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
            .delete(baselines)
            .where(eq(baselines.id, Number(id)))
            .returning();

        if (!deleted) {
            return errorResponse("Baseline not found", 404);
        }

        return successResponse({ message: "Baseline deleted" });
    } catch (error) {
        return errorResponse(error);
    }
}
