import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

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
