import { NextRequest, NextResponse } from "next/server";
import { getDb, baselines } from "@perf-test/db";
import { eq } from "drizzle-orm";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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
            .where(eq(baselines.id, Number(id)))
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
