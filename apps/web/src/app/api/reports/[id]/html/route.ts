import { NextRequest, NextResponse } from "next/server";
import { getDb, reports } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { existsSync, readFileSync } from "fs";
import {
  generateReport,
  generateHtmlReport,
} from "@perf-test/report-generator";
import { requireSession } from "@/lib/auth";
import { idParamSchema } from "@/lib/validation";
import { validateParams } from "@/lib/api-utils";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireSession(request);
    if (session instanceof NextResponse) return session;
    const { id } = await params;
    const validation = validateParams(idParamSchema, { id });
    if (!validation.success) return validation.response;
    const reportId = validation.data.id;

    const db = getDb();
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!report) {
      return NextResponse.json(
        { success: false, error: "Report not found" },
        { status: 404 }
      );
    }

    if (report.htmlFilePath && existsSync(report.htmlFilePath)) {
      const htmlContent = readFileSync(report.htmlFilePath, "utf-8");
      return new NextResponse(htmlContent, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    const generated = await generateReport({
      name: report.name,
      type: report.type as "comparison" | "single" | "baseline",
      testRunIds: report.testRunIds as number[],
      baselineId: report.baselineId || undefined,
    });

    const htmlContent = generateHtmlReport({
      title: report.name,
      comparison: generated.comparison,
      summary: generated.summary,
      thresholds: generated.thresholds,
      generatedAt: generated.generatedAt,
    });

    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:;",
      },
    });
  } catch (error) {
    console.error("Error rendering HTML report:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
