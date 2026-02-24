import { NextRequest, NextResponse } from "next/server";
import { getDb, schedules } from "@perf-test/db";
import { desc } from "drizzle-orm";

export async function GET() {
    try {
        const db = getDb();
        const allSchedules = await db
            .select()
            .from(schedules)
            .orderBy(desc(schedules.createdAt));

        return NextResponse.json({ success: true, data: allSchedules });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const body = await request.json();

        const [result] = await db
            .insert(schedules)
            .values({
                name: body.name,
                description: body.description,
                cronExpression: body.cronExpression,
                scenarioId: body.scenarioId,
                testTypeId: body.testTypeId,
                versionId: body.versionId,
                jmxScriptId: body.jmxScriptId,
                isActive: body.isActive ?? true,
            })
            .returning();

        return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
