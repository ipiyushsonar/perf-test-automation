import { NextRequest, NextResponse } from "next/server";
import { GrafanaClient, type GrafanaConfig } from "@perf-test/grafana-client";
import { requireAdmin } from "@/lib/auth";
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

export async function GET(request: NextRequest) {
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
