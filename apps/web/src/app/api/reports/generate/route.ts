import { NextRequest, NextResponse } from "next/server";
import { getDb, testRuns, baselines } from "@perf-test/db";
import { eq, inArray } from "drizzle-orm";
import {
  generateAndSaveReport,
  type GenerateReportInput,
} from "@perf-test/report-generator";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      testRunIds,
      baselineId,
      type = "comparison",
      outputFormats = ["excel", "html"],
      thresholds,
    } = body;

    if (!testRunIds || !Array.isArray(testRunIds) || testRunIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "testRunIds is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const validTestRuns = await db
      .select()
      .from(testRuns)
      .where(inArray(testRuns.id, testRunIds));

    if (validTestRuns.length !== testRunIds.length) {
      const foundIds = validTestRuns.map((t) => t.id);
      const missingIds = testRunIds.filter((id: number) => !foundIds.includes(id));
      return NextResponse.json(
        { success: false, error: `Test runs not found: ${missingIds.join(", ")}` },
        { status: 404 }
      );
    }

    let resolvedBaselineId = baselineId;

    if (!resolvedBaselineId && validTestRuns.length > 0) {
      const [defaultBaseline] = await db
        .select()
        .from(baselines)
        .where(eq(baselines.isDefault, true))
        .limit(1);

      if (defaultBaseline) {
        resolvedBaselineId = defaultBaseline.id;
      }
    }

    const input: GenerateReportInput = {
      name,
      type,
      testRunIds,
      baselineId: resolvedBaselineId,
      thresholds,
    };

    const result = await generateAndSaveReport({
      ...input,
      outputFormats,
    });

    return NextResponse.json({
      success: true,
      data: {
        reportId: result.reportId,
        summary: result.summary,
        hasExcel: !!result.excelBuffer,
        hasHtml: !!result.htmlContent,
      },
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
