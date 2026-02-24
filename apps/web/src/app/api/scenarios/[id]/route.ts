import { NextRequest, NextResponse } from "next/server";
import { getDb, scenarios } from "@perf-test/db";
import { eq } from "drizzle-orm";

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
            return NextResponse.json(
                { success: false, error: "Scenario not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: scenario });
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
            .update(scenarios)
            .set({
                name: body.name,
                displayName: body.displayName,
                description: body.description,
                testType: body.testType,
                loadUserCount: body.loadUserCount,
                stressUserCount: body.stressUserCount,
                durationMinutes: body.durationMinutes,
                rampUpSeconds: body.rampUpSeconds,
                cooldownSeconds: body.cooldownSeconds,
                defaultJmxScriptId: body.defaultJmxScriptId,
                config: body.config,
            })
            .where(eq(scenarios.id, Number(id)))
            .returning();

        if (!result) {
            return NextResponse.json(
                { success: false, error: "Scenario not found" },
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
            .delete(scenarios)
            .where(eq(scenarios.id, Number(id)))
            .returning();

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: "Scenario not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: "Scenario deleted" });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
