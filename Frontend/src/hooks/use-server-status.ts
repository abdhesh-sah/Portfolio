import { API_BASE_URL } from "#src/lib/api-helpers";

/**
 * Server status states:
 * - "checking"  → initial ping in progress
 * - "online"    → /health responded 200 OK
 * - "waking"    → response was slow (>3 s) or returned non-200 (cold start)
 * - "offline"   → network error / server totally unreachable
 */
export type ServerStatus = "checking" | "online" | "waking" | "offline";

const HEALTH_URL = `${API_BASE_URL}/api/v1/health`;
const COLD_START_TIMEOUT_MS = 10_000; // 10s — Render cold starts can be slow

/**
 * Fetch with an AbortController-based timeout.
 * Returns { ok, slow } where `slow` is true when the response took longer
 * than `COLD_START_TIMEOUT_MS` (but eventually succeeded).
 */
export async function pingHealth(signal?: AbortSignal): Promise<{ ok: boolean; slow: boolean }> {
  const controller = new AbortController();

  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  let slow = false;
  const slowTimer = setTimeout(() => {
    slow = true;
    controller.abort(); // Actually abort the request on timeout
  }, COLD_START_TIMEOUT_MS);

  try {
    const res = await fetch(HEALTH_URL, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      credentials: "include", // Match other API calls for CORS consistency
    });
    clearTimeout(slowTimer);
    return { ok: res.ok, slow: false }; // If it reached here, it wasn't a timeout
  } catch (err: unknown) {
    clearTimeout(slowTimer);
    if (err instanceof Error && err.name === 'AbortError' && slow) {
      return { ok: false, slow: true };
    }
    return { ok: false, slow: false };
  } finally {
    signal?.removeEventListener("abort", onExternalAbort);
  }
}
