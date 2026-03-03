import { NextRequest, NextResponse } from "next/server";
import { getDb, testRuns, baselines } from "@perf-test/db";
import { eq, inArray } from "drizzle-orm";
import {
  generateAndSaveReport,
  type GenerateReportInput,
} from "@perf-test/report-generator";
import { requireAdmin } from "@/lib/auth";
import { generateReportSchema } from "@/lib/validation";
import { validateBody } from "@/lib/api-utils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = requireAdmin(request);
    if (session instanceof NextResponse) return session;
    const body = await request.json();

    const validation = validateBody(generateReportSchema, body);
    if (!validation.success) return validation.response;
    const {
      name,
      testRunIds,
      baselineId,
      type = "comparison",
      outputFormats = ["excel", "html"],
      thresholds,
    } = validation.data;

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

    let resolvedBaselineId = baselineId ?? undefined;

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
      baselineId: resolvedBaselineId ?? undefined,
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
