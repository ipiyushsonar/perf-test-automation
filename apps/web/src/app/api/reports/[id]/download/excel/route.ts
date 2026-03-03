import { NextRequest, NextResponse } from "next/server";
import { getDb, reports } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { existsSync, readFileSync } from "fs";
import { basename, resolve } from "path";
import {
  generateReport,
  generateExcelReport,
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
    const reportsRoot = resolve(dataDir, "reports", "excel");

    if (report.excelFilePath && existsSync(report.excelFilePath)) {
      const resolvedPath = resolve(report.excelFilePath);
      if (!resolvedPath.startsWith(reportsRoot)) {
        return NextResponse.json(
          { success: false, error: "Invalid report path" },
          { status: 400 }
        );
      }
      const fileBuffer = readFileSync(resolvedPath);
      const filename = basename(resolvedPath);

      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const generated = await generateReport({
      name: report.name,
      type: report.type as "comparison" | "single" | "baseline",
      testRunIds: report.testRunIds as number[],
      baselineId: report.baselineId || undefined,
    });

    const excelBuffer = await generateExcelReport({
      title: report.name,
      comparison: generated.comparison,
      summary: generated.summary,
      thresholds: generated.thresholds,
      generatedAt: generated.generatedAt,
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `${report.name.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}.xlsx`;

    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating Excel report:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
