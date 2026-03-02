import { NextRequest, NextResponse } from "next/server";
import { getDb, settings } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { validateBody } from "@/lib/api-utils";
import { webhookSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Webhook receiver for CI/CD triggers
 * POST /api/webhooks — trigger a test run from an external CI/CD pipeline
 */
export async function POST(request: NextRequest) {
    try {
        const rateKey = `webhook:${request.headers.get("x-forwarded-for") || "unknown"}`;
        if (!rateLimit(rateKey, 30, 60_000)) {
            return NextResponse.json(
                { success: false, error: "Rate limit exceeded" },
                { status: 429 }
            );
        }
        // Validate API token from Authorization header
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, error: "Missing or invalid Authorization header" },
                { status: 401 }
            );
        }

        const token = authHeader.slice(7);

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Invalid API token" },
                { status: 401 }
            );
        }

        const db = getDb();
        const stored = await db
            .select()
            .from(settings)
            .where(eq(settings.category, "webhook"));

        const config: Record<string, string> = {};
        for (const s of stored) {
            config[s.key] = typeof s.value === "string" ? JSON.parse(s.value) : s.value;
        }

        if (!config.secret || config.secret !== token) {
            return NextResponse.json(
                { success: false, error: "Invalid API token" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const validation = validateBody(webhookSchema, body);
        if (!validation.success) return validation.response;
        const {
            scenarioId,
            versionId,
            testType = "load",
            userCount,
            durationMinutes,
            callback_url,
        } = validation.data;

        // Create the test run via internal API
        const testRes = await fetch(
            new URL("/api/tests", request.url).toString(),
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scenarioId,
                    versionId,
                    testType,
                    userCount,
                    durationMinutes,
                    runnerType: "local",
                    source: "webhook",
                    callbackUrl: callback_url,
                }),
            }
        );

        const testData = await testRes.json();

        if (!testData.success) {
            return NextResponse.json(
                { success: false, error: testData.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                testRunId: testData.data.id,
                status: "queued",
                message: "Test run created via webhook",
                statusUrl: `/api/tests/${testData.data.id}/status`,
            },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
