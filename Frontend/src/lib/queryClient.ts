import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { hydrateFromCache, subscribeToQueryCache } from "./query-cache-persister";
import { apiFetch, ApiError } from "./api-helpers";


export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Delegate to apiFetch for automatic 401 refresh + CSRF handling.
  // Wraps result in a synthetic Response for backward compatibility with
  // callers that invoke .json() or check .ok / .status on the return value.
  try {
    const result = await apiFetch(url, {
      method,
      body: data ? JSON.stringify(data) : undefined,
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      // Propagate the real HTTP status so callers that check response.ok
      // or response.status receive accurate information.
      return new Response(JSON.stringify({ ...(err.data as object), message: err.message }),
        { status: err.status, headers: { "Content-Type": "application/json" } });
    }
    throw err;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export function getQueryFn<T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> {
  const { on401: unauthorizedBehavior } = options;
  return async ({ queryKey }) => {
    try {
      let url = queryKey.join("/") as string;
      // Normalize double slashes and ensure a leading slash
      url = url.replace(/\/+/g, "/");
      if (!url.startsWith("/")) {
        url = "/" + url;
      }
      // apiFetch returns parsed JSON directly and handles 401 refresh
      return await apiFetch(url);
    } catch (err) {
      if (err instanceof ApiError && unauthorizedBehavior === "returnNull" && err.status === 401) {
        return null as T;
      }
      throw err;
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: unknown) => {
        // Don't retry 401 errors
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        // Retry up to 3 times for network/5xx errors (handles cold starts)
        // Wait 1s, 3s, 7s between attempts
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff: 1s, 3s, 7s
        return Math.pow(2, attemptIndex) * 1000 + Math.random() * 1000;
      },
    },
    mutations: {
      retry: (failureCount, error: unknown) => {
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => {
        return Math.pow(2, attemptIndex) * 1000 + Math.random() * 1000;
      },
    },
  },
});

// Hydrate from localStorage so returning users see cached data instantly,
// then subscribe to persist future successful fetches.
hydrateFromCache(queryClient);
subscribeToQueryCache(queryClient);
