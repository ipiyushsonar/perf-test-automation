import { NextRequest, NextResponse } from "next/server";
import { getDb, reports } from "@perf-test/db";
import { desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { paginationSchema } from "@/lib/validation";
import { validateQuery } from "@/lib/api-utils";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    if (session instanceof NextResponse) return session;
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const pagination = validateQuery(paginationSchema, searchParams);
    if (!pagination.success) return pagination.response;
    const { limit, offset } = pagination.data;

    const allReports = await db
      .select()
      .from(reports)
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: allReports,
      meta: {
        limit,
        offset,
        total: allReports.length,
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
