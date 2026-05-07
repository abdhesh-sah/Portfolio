export const API_BASE_URL = (() => {
    let url: string;

    // If running on localhost (dev or e2e), always use relative paths 
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "[::1]")) {
        url = "";
    } else if (import.meta.env.DEV) {
        url = "";
    } else {
        url = import.meta.env.VITE_PRODUCTION_API_URL || import.meta.env.VITE_API_URL || "";
    }


    let prodUrl = url;

    if (prodUrl && !prodUrl.startsWith("http")) {
        prodUrl = `https://${prodUrl}`;
    }

    if (!prodUrl) {
        console.warn("⚠️ VITE_API_URL not configured. Falling back to relative path or placeholder.");
        // Fallback to relative or a safe default if available, 
        // but don't throw to avoid total boot failure.
        return window.location.origin;
    }

    // Strip any trailing slashes to prevent //api/v1 double-slash 404s
    return prodUrl.replace(/\/+$/, "");
})();

export class ApiError extends Error {
    constructor(public status: number, message: string, public data?: unknown) {
        super(message);
        this.name = "ApiError";
    }
}

// In-memory storage for CSRF token to handle cross-origin SOP restrictions
let memCsrfToken: string | null = null;

export function setCsrfToken(token: string) {
    memCsrfToken = token;
}

export function getCsrfToken() {
    return memCsrfToken;
}

export function authHeaders() {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // 1. Try in-memory token (captured from login/refresh response body)
    if (memCsrfToken) {
        headers["X-CSRF-Token"] = memCsrfToken;
    }
    // 2. Fallback to reading from cookie (Double Submit)
    else {
        const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
        if (csrfMatch) {
            headers["X-CSRF-Token"] = decodeURIComponent(csrfMatch[1]);
        }
    }

    return headers;
}

/**
 * Deduplicates concurrent refresh attempts — all 401 callers share a single refresh request.
 */
let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: "POST",
            credentials: "include",
        });
        if (res.ok) {
            const data = await res.json();
            if (data.csrfToken) {
                setCsrfToken(data.csrfToken);
            }
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Validated API fetch wrapper.
 * 
 * @param path    API path (e.g. "/api/v1/projects")
 * @param opts    Standard RequestInit options
 * @param schema  Optional Zod schema for response validation via `.safeParse()`
 *                When provided, response data is validated and typed automatically.
 *                On validation failure, throws ApiError with detailed contract info.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiFetch<T = any>(
    path: string, 
    opts: RequestInit = {},
    schema?: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { issues: Array<{ path: (string | number)[]; message: string }> } } }
): Promise<T> {
    const headers = { ...authHeaders(), ...(opts.headers as Record<string, string> ?? {}) };
    if (opts.body instanceof FormData) {
        delete headers["Content-Type"];
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...opts,
        credentials: 'include',
        headers,
    });

    // Silent refresh on 401 — skip for certain endpoints to avoid infinite loops or incorrect error reporting
    if (res.status === 401 && !path.includes("/auth/refresh") && !path.includes("/auth/login")) {

        // Deduplicate concurrent refresh attempts
        if (!refreshPromise) {
            refreshPromise = attemptRefresh().finally(() => { refreshPromise = null; });
        }

        const refreshed = await refreshPromise;

        if (refreshed) {
            // Retry original request with fresh access token
            const retryHeaders = { ...authHeaders(), ...(opts.headers as Record<string, string> ?? {}) };
            if (opts.body instanceof FormData) {
                delete retryHeaders["Content-Type"];
            }

            const retryRes = await fetch(`${API_BASE_URL}${path}`, {
                ...opts,
                credentials: 'include',
                headers: retryHeaders,
            });
            if (!retryRes.ok) {
                const err = await retryRes.json().catch(() => ({ message: retryRes.statusText }));
                throw new ApiError(retryRes.status, err.message || `Request failed (${retryRes.status})`, err);
            }
            if (retryRes.status === 204) return null as T;
            const retryData = await retryRes.json();
            return validateResponse(retryData, path, schema);
        }

        // Refresh failed — notify AuthProvider via event (avoids full page reload)
        window.dispatchEvent(new CustomEvent("auth:session-expired"));
        throw new ApiError(401, "Session expired. Please login again.");
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new ApiError(res.status, err.message || err.error || `Request failed (${res.status})`, err);
    }
    if (res.status === 204) return null as T;
    const data = await res.json();
    return validateResponse(data, path, schema);
}

/**
 * Validates API response data against an optional Zod schema.
 * On failure, logs detailed contract violation info and throws ApiError.
 */
function validateResponse<T>(
    data: unknown, 
    path: string,
    schema?: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { issues: Array<{ path: (string | number)[]; message: string }> } } }
): T {
    if (!schema) return data as T;

    const result = schema.safeParse(data);
    if (result.success) {
        return result.data as T;
    }

    // Contract violation — detailed reporting
    const issues = result.error?.issues ?? [];
    const summary = issues
        .slice(0, 5)
        .map(i => `  ${i.path.join(".")}: ${i.message}`)
        .join("\n");

    const message = `[Contract Violation] ${path}\n${summary}${issues.length > 5 ? `\n  ...and ${issues.length - 5} more` : ""}`;

    if (import.meta.env.DEV) {
        console.error(message, "\nFull data:", data);
    }

    throw new ApiError(0, `API contract violation on ${path}: response does not match expected schema`, {
        contractViolation: true,
        path,
        issues,
    });
}

