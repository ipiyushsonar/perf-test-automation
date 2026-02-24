import { NextRequest, NextResponse } from "next/server";
import { DashboardManager, type GrafanaConfig } from "@perf-test/grafana-client";
import { getDb, settings, grafanaSnapshots } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { join } from "path";

export const runtime = "nodejs";

async function getGrafanaConfig(): Promise<GrafanaConfig | null> {
    const db = getDb();
    const grafanaSettings = await db
        .select()
        .from(settings)
        .where(eq(settings.category, "grafana"));

    const config: Record<string, string> = {};
    for (const s of grafanaSettings) {
        config[s.key] = typeof s.value === "string" ? JSON.parse(s.value) : s.value;
    }

    if (!config.url || !config.apiToken) return null;

    return {
        url: config.url as string,
        apiToken: config.apiToken as string,
    };
}

export async function POST(request: NextRequest) {
    try {
        const config = await getGrafanaConfig();
        if (!config) {
            return NextResponse.json(
                { success: false, error: "Grafana not configured" },
                { status: 400 }
            );
        }

        const body = await request.json();
        const {
            dashboardUid,
            testRunId,
            reportId,
            from,
            to,
            panelIds,
            width,
            height,
            theme,
        } = body;

        if (!dashboardUid) {
            return NextResponse.json(
                { success: false, error: "dashboardUid is required" },
                { status: 400 }
            );
        }

        const dataDir = process.env.DATA_DIR || "./data";
        const outputDir = join(dataDir, "grafana-snapshots");

        const manager = new DashboardManager(config);
        const results = await manager.captureAndSave(dashboardUid, outputDir, {
            from,
            to,
            panelIds,
            width,
            height,
            theme,
            fileNamePrefix: testRunId ? `test_${testRunId}` : undefined,
        });

        // Store in database
        const db = getDb();
        const dbRecords = [];

        for (const result of results) {
            const [record] = await db
                .insert(grafanaSnapshots)
                .values({
                    reportId: reportId || null,
                    testRunId: testRunId || null,
                    dashboardUid,
                    dashboardName: dashboardUid,
                    panelId: result.panelId,
                    panelTitle: result.panelTitle,
                    timeFrom: from ? new Date(Number(from)) : null,
                    timeTo: to ? new Date(Number(to)) : null,
                    imagePath: result.filePath,
                    imageSize: result.imageSize,
                })
                .returning();

            dbRecords.push(record);
        }

        return NextResponse.json({
            success: true,
            data: {
                captured: results.length,
                snapshots: dbRecords,
            },
        });
    } catch (error) {
        console.error("Error capturing Grafana panels:", error);
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
