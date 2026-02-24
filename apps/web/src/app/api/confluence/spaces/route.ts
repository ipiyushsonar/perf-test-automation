import { NextResponse } from "next/server";
import { ConfluenceClient, type ConfluenceConfig } from "@perf-test/confluence-client";
import { getDb, settings } from "@perf-test/db";
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

export async function GET() {
    try {
        const config = await getConfluenceConfig();
        if (!config) {
            return NextResponse.json(
                { success: false, error: "Confluence not configured" },
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
