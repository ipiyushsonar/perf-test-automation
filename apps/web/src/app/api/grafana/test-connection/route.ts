import { NextRequest, NextResponse } from "next/server";
import { GrafanaClient } from "@perf-test/grafana-client";
import { requireAdmin } from "@/lib/auth";
import { grafanaTestSchema } from "@/lib/validation";
import { validateBody } from "@/lib/api-utils";
import { validateAllowedUrl } from "@/lib/url-guard";
import { getSettingsCategory } from "@/lib/settings";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const session = requireAdmin(request);
        if (session instanceof NextResponse) return session;
        const body = await request.json();
        const validation = validateBody(grafanaTestSchema, body);
        if (!validation.success) return validation.response;
        const { url, apiToken } = validation.data;

        // Use provided values or fall back to saved settings
        let grafanaUrl = url;
        let grafanaToken = apiToken;

        if (!grafanaUrl || !grafanaToken) {
            const config = await getSettingsCategory("grafana");

            grafanaUrl = grafanaUrl || (config.url as string | undefined);
            grafanaToken = grafanaToken || (config.apiToken as string | undefined);
        }

        if (!grafanaUrl || !grafanaToken) {
            return NextResponse.json(
                { success: false, error: "Grafana URL and API token are required" },
                { status: 400 }
            );
        }

        const urlValidation = validateAllowedUrl(grafanaUrl);
        if (!urlValidation.ok) {
            return NextResponse.json(
                { success: false, error: urlValidation.error },
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
