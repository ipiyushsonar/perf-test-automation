import { NextRequest, NextResponse } from "next/server";
import { getDb, baselines } from "@perf-test/db";
import { eq } from "drizzle-orm";

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
            return NextResponse.json(
                { success: false, error: "Baseline not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: baseline });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
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

        const [result] = await db
            .update(baselines)
            .set({
                name: body.name,
                description: body.description,
                metrics: body.metrics,
            })
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
            return NextResponse.json(
                { success: false, error: "Baseline not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: "Baseline deleted" });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
