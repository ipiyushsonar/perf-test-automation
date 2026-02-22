import { getDb } from "@perf-test/db";
import { testRuns, scenarios, reports } from "@perf-test/db";
import { sql, eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = getDb();

    // Count tests by status
    const statusCounts = await db
      .select({
        status: testRuns.status,
        count: sql<number>`count(*)`,
      })
      .from(testRuns)
      .groupBy(testRuns.status);

    const totalTests = statusCounts.reduce((sum, s) => sum + s.count, 0);
    const completedTests =
      statusCounts.find((s) => s.status === "completed")?.count || 0;
    const failedTests =
      statusCounts.find((s) => s.status === "failed")?.count || 0;

    // Active scenarios
    const [activeScenarios] = await db
      .select({ count: sql<number>`count(*)` })
      .from(scenarios)
      .where(eq(scenarios.isActive, true));

    // Total reports
    const [totalReports] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reports);

    // Last test run
    const [lastTest] = await db
      .select()
      .from(testRuns)
      .orderBy(desc(testRuns.createdAt))
      .limit(1);

    // Recent tests (last 10)
    const recentTests = await db
      .select()
      .from(testRuns)
      .orderBy(desc(testRuns.createdAt))
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        totalTests,
        completedTests,
        failedTests,
        activeScenarios: activeScenarios?.count || 0,
        totalReports: totalReports?.count || 0,
        lastTestRun: lastTest || null,
        recentTests,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
