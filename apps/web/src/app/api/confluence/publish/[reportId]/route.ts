import { NextRequest, NextResponse } from "next/server";
import { ConfluencePublisher, type ConfluenceConfig } from "@perf-test/confluence-client";
import { getDb, settings, reports } from "@perf-test/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

async function getConfluenceConfig(): Promise<ConfluenceConfig | null> {
    const db = getDb();
    const confluenceSettings = await db
        .select()
        .from(settings)
        .where(eq(settings.category, "confluence"));

    const config: Record<string, string> = {};
    for (const s of confluenceSettings) {
        config[s.key] = typeof s.value === "string" ? JSON.parse(s.value) : s.value;
    }

    if (!config.url || !config.username || !config.apiToken || !config.spaceKey) return null;

    return {
        url: config.url as string,
        username: config.username as string,
        apiToken: config.apiToken as string,
        spaceKey: config.spaceKey as string,
        parentPageId: config.parentPageId as string | undefined,
    };
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ reportId: string }> }
) {
    try {
        const { reportId } = await params;
        const config = await getConfluenceConfig();

        if (!config) {
            return NextResponse.json(
                { success: false, error: "Confluence not configured" },
                { status: 400 }
            );
        }

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

        const publisher = new ConfluencePublisher(config);

        const result = await publisher.publishReport({
            reportId: report.id,
            reportName: report.name,
            excelFilePath: report.excelFilePath || undefined,
            htmlFilePath: report.htmlFilePath || undefined,
        });

        // Update report with Confluence info
        await db
            .update(reports)
            .set({
                confluencePublished: true,
                confluencePageId: result.pageId,
                confluenceUrl: result.pageUrl,
            })
            .where(eq(reports.id, report.id));

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("Error publishing to Confluence:", error);
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
