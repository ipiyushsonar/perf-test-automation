import { getDb } from "@perf-test/db";
import { scenarios } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const db = getDb();
    const allScenarios = await db.select().from(scenarios).orderBy(scenarios.name);
    return NextResponse.json({ success: true, data: allScenarios });
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
      .insert(scenarios)
      .values({
        name: body.name,
        displayName: body.displayName,
        description: body.description,
        testType: body.testType || "combined",
        loadUserCount: body.loadUserCount,
        stressUserCount: body.stressUserCount,
        durationMinutes: body.durationMinutes || 60,
        rampUpSeconds: body.rampUpSeconds || 60,
        cooldownSeconds: body.cooldownSeconds || 900,
        defaultJmxScriptId: body.defaultJmxScriptId,
        config: body.config,
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
