import { NextRequest, NextResponse } from "next/server";
import { getDb, schedules } from "@perf-test/db";
import { eq } from "drizzle-orm";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = getDb();
        const [schedule] = await db
            .select()
            .from(schedules)
            .where(eq(schedules.id, Number(id)))
            .limit(1);

        if (!schedule) {
            return NextResponse.json(
                { success: false, error: "Schedule not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: schedule });
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
            .update(schedules)
            .set({
                name: body.name,
                description: body.description,
                cronExpression: body.cronExpression,
                scenarioId: body.scenarioId,
                testTypeId: body.testTypeId,
                versionId: body.versionId,
                jmxScriptId: body.jmxScriptId,
                isActive: body.isActive,
            })
            .where(eq(schedules.id, Number(id)))
            .returning();

        if (!result) {
            return NextResponse.json(
                { success: false, error: "Schedule not found" },
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
            .delete(schedules)
            .where(eq(schedules.id, Number(id)))
            .returning();

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: "Schedule not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: "Schedule deleted" });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
