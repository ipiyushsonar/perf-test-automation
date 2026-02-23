import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Webhook receiver for CI/CD triggers
 * POST /api/webhooks — trigger a test run from an external CI/CD pipeline
 */
export async function POST(request: NextRequest) {
    try {
        // Validate API token from Authorization header
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, error: "Missing or invalid Authorization header" },
                { status: 401 }
            );
        }

        const token = authHeader.slice(7);

        // TODO: Validate token against stored API tokens in settings
        // For now, accept any non-empty token
        if (!token) {
            return NextResponse.json(
                { success: false, error: "Invalid API token" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            scenarioId,
            versionId,
            testType = "load",
            userCount,
            durationMinutes,
            callback_url,
        } = body;

        if (!scenarioId || !versionId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "scenarioId and versionId are required",
                },
                { status: 400 }
            );
        }

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
