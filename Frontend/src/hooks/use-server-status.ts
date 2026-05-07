import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
const POLL_INTERVAL_MS = 5_000;      // retry every 5 s when not online

/**
 * Fetch with an AbortController-based timeout.
 * Returns { ok, slow } where `slow` is true when the response took longer
 * than `COLD_START_TIMEOUT_MS` (but eventually succeeded).
 */
async function pingHealth(signal?: AbortSignal): Promise<{ ok: boolean; slow: boolean }> {
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

export function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>("checking");
  const queryClient = useQueryClient();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const wasOfflineRef = useRef(false); // tracks if we ever left "online"
  const failCountRef = useRef(0);
  const OFFLINE_THRESHOLD = 3;

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Use a ref to always hold the latest `check` so that `startPolling`
  // never captures a stale closure.
  const checkRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return; // already polling
    pollingRef.current = setInterval(() => {
      checkRef.current?.();
    }, POLL_INTERVAL_MS);
  }, []);

  const check = useCallback(async () => {
    // Create a fresh AbortController per check
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const { ok, slow } = await pingHealth(ac.signal);

    // If this check was aborted (component unmounted), ignore the result
    if (ac.signal.aborted) return;

    if (ok) {
      failCountRef.current = 0;
      setStatus("online");
      stopPolling();

      // If we were previously in a degraded state, refetch all queries
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        queryClient.invalidateQueries();
      }
    } else {
      // Server is unreachable — mark degraded and start polling
      wasOfflineRef.current = true;

      if (slow) {
        failCountRef.current = 0; // Reset — server is waking, not offline
      } else {
        failCountRef.current += 1;
      }

      setStatus((prev) => {
        if (slow) return "waking";
        // If we've failed enough times, mark as offline even if it was "waking" before
        if (failCountRef.current >= OFFLINE_THRESHOLD) return "offline";
        return prev === "checking" ? "offline" : prev;
      });
      startPolling();
    }
  }, [queryClient, stopPolling, startPolling]);

  // Keep the ref in sync with the latest `check`
  useEffect(() => {
    checkRef.current = check;
  }, [check]);

  // Initial check on mount
  useEffect(() => {
    check();
    return () => {
      abortRef.current?.abort();
      stopPolling();
    };
  }, [check, stopPolling]);

  return status;
}
