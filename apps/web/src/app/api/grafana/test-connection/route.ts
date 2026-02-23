import { NextRequest, NextResponse } from "next/server";
import { GrafanaClient, type GrafanaConfig } from "@perf-test/grafana-client";
import { getDb, settings } from "@perf-test/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, apiToken } = body;

        // Use provided values or fall back to saved settings
        let grafanaUrl = url;
        let grafanaToken = apiToken;

        if (!grafanaUrl || !grafanaToken) {
            const db = getDb();
            const grafanaSettings = await db
                .select()
                .from(settings)
                .where(eq(settings.category, "grafana"));

            const config: Record<string, string> = {};
            for (const s of grafanaSettings) {
                config[s.key] = typeof s.value === "string" ? JSON.parse(s.value) : s.value;
            }

            grafanaUrl = grafanaUrl || config.url;
            grafanaToken = grafanaToken || config.apiToken;
        }

        if (!grafanaUrl || !grafanaToken) {
            return NextResponse.json(
                { success: false, error: "Grafana URL and API token are required" },
                { status: 400 }
            );
        }

        const client = new GrafanaClient({
            url: grafanaUrl,
            apiToken: grafanaToken,
        });

        const health = await client.testConnection();

        return NextResponse.json({
            success: true,
            data: {
                connected: true,
                version: health.version,
                database: health.database,
            },
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            data: {
                connected: false,
                error: String(error),
            },
        });
    }
}
