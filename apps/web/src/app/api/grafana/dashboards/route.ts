import { NextResponse } from "next/server";
import { GrafanaClient, type GrafanaConfig } from "@perf-test/grafana-client";
import { getDb, settings } from "@perf-test/db";
import { eq, and } from "drizzle-orm";

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

export async function GET() {
    try {
        const config = await getGrafanaConfig();
        if (!config) {
            return NextResponse.json(
                { success: false, error: "Grafana not configured" },
                { status: 400 }
            );
        }

        const client = new GrafanaClient(config);
        const dashboards = await client.listDashboards();

        return NextResponse.json({ success: true, data: dashboards });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
