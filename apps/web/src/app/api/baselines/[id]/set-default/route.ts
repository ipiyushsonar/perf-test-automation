import { NextRequest, NextResponse } from "next/server";
import { getDb, baselines } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { idParamSchema } from "@/lib/validation";
import { validateParams } from "@/lib/api-utils";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = requireAdmin(request);
        if (session instanceof NextResponse) return session;
        const { id } = await params;
        const validation = validateParams(idParamSchema, { id });
        if (!validation.success) return validation.response;
        const db = getDb();

        // Unset all existing defaults
        await db
            .update(baselines)
            .set({ isDefault: false })
            .where(eq(baselines.isDefault, true));

        // Set this one as default
        const [result] = await db
            .update(baselines)
            .set({ isDefault: true })
            .where(eq(baselines.id, validation.data.id))
            .returning();

        if (!result) {
            return NextResponse.json(
                { success: false, error: "Baseline not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
