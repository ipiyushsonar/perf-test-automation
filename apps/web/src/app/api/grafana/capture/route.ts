import { NextRequest, NextResponse } from "next/server";
import { DashboardManager, type GrafanaConfig } from "@perf-test/grafana-client";
import { getDb, grafanaSnapshots } from "@perf-test/db";
import { join } from "path";
import { requireAdmin } from "@/lib/auth";
import { grafanaCaptureSchema } from "@/lib/validation";
import { validateBody } from "@/lib/api-utils";
import { validateAllowedUrl } from "@/lib/url-guard";
import { getSettingsCategory } from "@/lib/settings";

export const runtime = "nodejs";

async function getGrafanaConfig(): Promise<GrafanaConfig | null> {
    const config = await getSettingsCategory("grafana");

    if (!config.url || !config.apiToken) return null;

    return {
        url: config.url as string,
        apiToken: config.apiToken as string,
    };
}

export async function POST(request: NextRequest) {
    try {
        const session = requireAdmin(request);
        if (session instanceof NextResponse) return session;
        const config = await getGrafanaConfig();
        if (!config) {
            return NextResponse.json(
                { success: false, error: "Grafana not configured" },
                { status: 400 }
            );
        }

        const urlValidation = validateAllowedUrl(config.url);
        if (!urlValidation.ok) {
            return NextResponse.json(
                { success: false, error: urlValidation.error },
                { status: 400 }
            );
        }

        const body = await request.json();
        const validation = validateBody(grafanaCaptureSchema, body);
        if (!validation.success) return validation.response;
        const data = validation.data;
        const { dashboardUid, testRunId, reportId, from, to, panelIds, width, height, theme } = data;

        const fromValue = from !== undefined ? String(from) : undefined;
        const toValue = to !== undefined ? String(to) : undefined;

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
            from: fromValue,
            to: toValue,
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
                    timeFrom: fromValue ? new Date(Number(fromValue)) : null,
                    timeTo: toValue ? new Date(Number(toValue)) : null,
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
