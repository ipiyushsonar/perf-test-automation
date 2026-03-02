import { NextResponse } from "next/server";
import type { ZodSchema, ZodTypeAny } from "zod";

/**
 * Shared API response type.
 */
export type ApiResponse<T> =
    | { success: true; data: T }
    | { success: false; error: string; details?: unknown };

/**
 * Validate a request body against a Zod schema.
 * Returns either the validated data or a NextResponse with 400 status.
 */
export function validateBody<T>(
    schema: ZodSchema<T>,
    body: unknown
):
    | { success: true; data: T }
    | { success: false; response: NextResponse } {
    const result = schema.safeParse(body);
    if (!result.success) {
        return {
            success: false,
            response: NextResponse.json(
                {
                    success: false,
                    error: "Validation failed",
                    details: result.error.flatten(),
                },
                { status: 400 }
            ),
        };
    }
    return { success: true, data: result.data };
}

/**
 * Validate query params against a Zod schema.
 */
export function validateQuery<T extends ZodTypeAny>(
    schema: T,
    query: URLSearchParams
):
    | { success: true; data: ReturnType<T["parse"]> }
    | { success: false; response: NextResponse } {
    const raw: Record<string, string> = {};
    query.forEach((value, key) => {
        raw[key] = value;
    });
    const result = schema.safeParse(raw);
    if (!result.success) {
        return {
            success: false,
            response: NextResponse.json(
                {
                    success: false,
                    error: "Validation failed",
                    details: result.error.flatten(),
                },
                { status: 400 }
            ),
        };
    }

    return { success: true, data: result.data };
}

/**
 * Validate route params against a Zod schema.
 */
export function validateParams<T extends ZodTypeAny>(
    schema: T,
    params: Record<string, string | undefined>
):
    | { success: true; data: ReturnType<T["parse"]> }
    | { success: false; response: NextResponse } {
    const result = schema.safeParse(params);
    if (!result.success) {
        return {
            success: false,
            response: NextResponse.json(
                {
                    success: false,
                    error: "Validation failed",
                    details: result.error.flatten(),
                },
                { status: 400 }
            ),
        };
    }

    return { success: true, data: result.data };
}

/**
 * Helper to create a standard success response.
 */
export function successResponse<T>(data: T, status = 200) {
    return NextResponse.json({ success: true, data }, { status });
}

/**
 * Helper to create a standard error response.
 */
export function errorResponse(error: unknown, status = 500) {
    return NextResponse.json(
        { success: false, error: String(error) },
        { status }
    );
}
