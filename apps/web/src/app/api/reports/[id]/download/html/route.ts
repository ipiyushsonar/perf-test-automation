import { NextRequest, NextResponse } from "next/server";
import { getDb, reports } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { existsSync, readFileSync } from "fs";
import { basename, resolve } from "path";
import {
  generateReport,
  generateHtmlReport,
} from "@perf-test/report-generator";
import { requireAdmin } from "@/lib/auth";
import { idParamSchema } from "@/lib/validation";
import { validateParams } from "@/lib/api-utils";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireAdmin(request);
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

    const dataDir = process.env.DATA_DIR || "./data";
    const reportsRoot = resolve(dataDir, "reports", "html");

    if (report.htmlFilePath && existsSync(report.htmlFilePath)) {
      const resolvedPath = resolve(report.htmlFilePath);
      if (!resolvedPath.startsWith(reportsRoot)) {
        return NextResponse.json(
          { success: false, error: "Invalid report path" },
          { status: 400 }
        );
      }
      const htmlContent = readFileSync(resolvedPath, "utf-8");
      const filename = basename(resolvedPath);

      return new NextResponse(htmlContent, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:;",
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

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `${report.name.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}.html`;

    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:;",
      },
    });
  } catch (error) {
    console.error("Error generating HTML report:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
