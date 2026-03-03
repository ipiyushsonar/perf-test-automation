import { NextRequest, NextResponse } from "next/server";
import { ConfluenceClient, type ConfluenceConfig } from "@perf-test/confluence-client";
import { requireAdmin } from "@/lib/auth";
import { validateAllowedUrl } from "@/lib/url-guard";
import { getSettingsCategory } from "@/lib/settings";

export const runtime = "nodejs";

async function getConfluenceConfig(): Promise<ConfluenceConfig | null> {
    const config = await getSettingsCategory("confluence");

    if (!config.url || !config.username || !config.apiToken || !config.spaceKey) return null;

    return {
        url: config.url as string,
        username: config.username as string,
        apiToken: config.apiToken as string,
        spaceKey: config.spaceKey as string,
        parentPageId: config.parentPageId as string | undefined,
    };
}

export async function GET(request: NextRequest) {
    try {
        const session = requireAdmin(request);
        if (session instanceof NextResponse) return session;
        const config = await getConfluenceConfig();
        if (!config) {
            return NextResponse.json(
                { success: false, error: "Confluence not configured" },
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

        const client = new ConfluenceClient(config);
        const spaces = await client.getSpaces();

        return NextResponse.json({ success: true, data: spaces });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
