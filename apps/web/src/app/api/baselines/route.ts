import { NextRequest, NextResponse } from "next/server";
import { getDb, baselines } from "@perf-test/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
    try {
        const db = getDb();
        const allBaselines = await db
            .select()
            .from(baselines)
            .orderBy(desc(baselines.createdAt));

        return NextResponse.json({ success: true, data: allBaselines });
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
            .insert(baselines)
            .values({
                name: body.name,
                description: body.description,
                scenarioId: body.scenarioId,
                testTypeId: body.testTypeId,
                versionId: body.versionId,
                sourceTestRunId: body.sourceTestRunId,
                metrics: body.metrics,
                isDefault: body.isDefault || false,
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
