import { NextRequest } from "next/server";
import { getDb, versions } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { updateVersionSchema } from "@/lib/validation";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = getDb();
        const [version] = await db
            .select()
            .from(versions)
            .where(eq(versions.id, Number(id)))
            .limit(1);

        if (!version) {
            return errorResponse("Version not found", 404);
        }

        return successResponse(version);
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

        const validation = validateBody(updateVersionSchema, body);
        if (!validation.success) return validation.response;
        const data = validation.data;

        const [result] = await db
            .update(versions)
            .set({
                version: data.version,
                displayName: data.displayName,
                releaseDate: data.releaseDate ? new Date(data.releaseDate) : undefined,
                description: data.description,
            })
            .where(eq(versions.id, Number(id)))
            .returning();

        if (!result) {
            return errorResponse("Version not found", 404);
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
            .delete(versions)
            .where(eq(versions.id, Number(id)))
            .returning();

        if (!deleted) {
            return errorResponse("Version not found", 404);
        }

        return successResponse({ message: "Version deleted" });
    } catch (error) {
        return errorResponse(error);
    }
}
