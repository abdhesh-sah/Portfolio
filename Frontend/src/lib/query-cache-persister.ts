/**
 * Lightweight localStorage persistence layer for React Query.
 *
 * - On query success → data is saved to localStorage (keyed by queryKey).
 * - On app boot → cached data is hydrated into the QueryClient so returning
 *   users see content instantly while Render's free-tier backend wakes up.
 *
 * Only public portfolio queries are cached (no auth/admin data).
 */

import type { QueryClient } from "@tanstack/react-query";

/* ---------------------------------- */
/* Config                              */
/* ---------------------------------- */

const STORAGE_PREFIX = "pf_cache_";      // prefix to namespace our keys
const CACHE_VERSION = 1;                 // bump to bust stale schemas
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Only persist these public, read-only query keys. */
const CACHEABLE_KEYS = new Set([
  "projects",
  "skills",
  "skill-connections",
  "mindset",
  "experiences",
  "services",
  "testimonials",
  "articles",
  "settings",
  "case-studies",
]);

/* ---------------------------------- */
/* Helpers                             */
/* ---------------------------------- */

interface CacheEntry {
  v: number;     // version
  ts: number;    // timestamp (ms)
  data: unknown; // serialised query data
}

function storageKey(queryKey: readonly unknown[]): string {
  return STORAGE_PREFIX + JSON.stringify(queryKey);
}

function isCacheable(queryKey: readonly unknown[]): boolean {
  const first = queryKey[0];
  if (typeof first !== "string") return false;

  // Exact match (e.g. ["projects"])
  if (CACHEABLE_KEYS.has(first)) return true;

  // Path match (e.g. ["/api/v1/projects"])
  return [...CACHEABLE_KEYS].some(k => first.endsWith(`/${k}`) || first.endsWith(`${k}`));
}

const MAX_STORAGE_SIZE = 4.5 * 1024 * 1024; // 4.5MB (standard localStorage is ~5MB)

function getStoredCacheKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
  }
  return keys;
}

function getTotalCacheSize(): number {
  let size = 0;
  getStoredCacheKeys().forEach(key => {
    size += (localStorage.getItem(key) || "").length * 2; // UTF-16 strings are 2 bytes per char
  });
  return size;
}

function evictOldest(): boolean {
  const keys = getStoredCacheKeys();
  if (keys.length === 0) return false;

  let oldestKey: string | null = null;
  let oldestTs = Infinity;

  keys.forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const entry: CacheEntry = JSON.parse(raw);
        if (entry.ts < oldestTs) {
          oldestTs = entry.ts;
          oldestKey = key;
        }
      }
    } catch {
      // If corrupt, evict it
      oldestKey = key;
    }
  });

  if (oldestKey) {
    localStorage.removeItem(oldestKey);
    return true;
  }
  return false;
}

function writeToStorage(key: string, data: unknown): void {
  try {
    const entry: CacheEntry = { v: CACHE_VERSION, ts: Date.now(), data };
    const serialized = JSON.stringify(entry);

    // Check quota before writing
    const estimatedSize = serialized.length * 2;
    while (getTotalCacheSize() + estimatedSize > MAX_STORAGE_SIZE) {
      if (!evictOldest()) break;
    }

    localStorage.setItem(key, serialized);
  } catch (e) {
    // If we still hit a QuotaExceededError, clear all as a fallback
    if (e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      clearQueryCache();
      // Try one last time after clearing everything
      try {
        const entry: CacheEntry = { v: CACHE_VERSION, ts: Date.now(), data };
        localStorage.setItem(key, JSON.stringify(entry));
      } catch {
        // Give up
      }
    }
  }
}

function readFromStorage(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (entry.v !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }
    if (Date.now() - entry.ts > MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/* ---------------------------------- */
/* Public API                          */
/* ---------------------------------- */

/**
 * Hydrate the QueryClient from localStorage on app start.
 * Populates queries with cached data so they render immediately.
 * Fresh server data will overwrite these once the backend responds.
 */
export function hydrateFromCache(qc: QueryClient): void {
  if (typeof localStorage === "undefined") return;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;

    const data = readFromStorage(key);
    if (data == null) continue;

    // Reconstruct the queryKey from the storage key
    const queryKeyStr = key.slice(STORAGE_PREFIX.length);
    let queryKey: unknown[];
    try {
      queryKey = JSON.parse(queryKeyStr);
    } catch {
      // Legacy key format (pre-JSON) — remove and skip
      localStorage.removeItem(key);
      continue;
    }

    // Set data in the cache — it will be treated as stale if staleTime
    // has passed, triggering a background refetch automatically.
    qc.setQueryData(queryKey, data, { updatedAt: 0 });
  }
}

/**
 * Subscribe to the QueryCache so successful fetches are persisted.
 * Call once after creating the QueryClient. Returns an unsubscribe fn.
 */
export function subscribeToQueryCache(qc: QueryClient): () => void {
  return qc.getQueryCache().subscribe((event) => {
    if (
      event.type === "updated" &&
      event.action.type === "success" &&
      event.query.state.status === "success"
    ) {
      const queryKey = event.query.queryKey;
      if (isCacheable(queryKey)) {
        writeToStorage(storageKey(queryKey), event.query.state.data);
      }
    }
  });
}

/**
 * Clear all cached portfolio data from localStorage.
 * Useful after admin edits or if schemas change.
 */
export function clearQueryCache(): void {
  if (typeof localStorage === "undefined") return;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) toRemove.push(key);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}
