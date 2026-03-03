/**
 * Centralized fetch wrapper with error handling and type safety.
 */

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public details?: unknown
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export async function apiRequest<T>(
    url: string,
    options?: RequestInit
): Promise<T> {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json", ...options?.headers },
        ...options,
    });

    const data = await res.json();

    if (!data.success) {
        throw new ApiError(
            data.error || "API request failed",
            res.status,
            data.details
        );
    }

    return data.data as T;
}

/**
 * Shortcuts for common HTTP methods.
 */
export const api = {
    get: <T>(url: string) => apiRequest<T>(url),

    post: <T>(url: string, body: unknown) =>
        apiRequest<T>(url, {
            method: "POST",
            body: JSON.stringify(body),
        }),

    put: <T>(url: string, body: unknown) =>
        apiRequest<T>(url, {
            method: "PUT",
            body: JSON.stringify(body),
        }),

    delete: <T>(url: string) =>
        apiRequest<T>(url, { method: "DELETE" }),
};
