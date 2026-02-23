import { NextRequest, NextResponse } from "next/server";
import { getDb, reports } from "@perf-test/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ reportId: string }> }
) {
    try {
        const { reportId } = await params;
        const db = getDb();

        const [report] = await db
            .select()
            .from(reports)
            .where(eq(reports.id, Number(reportId)))
            .limit(1);

        if (!report) {
            return NextResponse.json(
                { success: false, error: `Report ${reportId} not found` },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                published: report.confluencePublished,
                pageId: report.confluencePageId,
                pageUrl: report.confluenceUrl,
            },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
