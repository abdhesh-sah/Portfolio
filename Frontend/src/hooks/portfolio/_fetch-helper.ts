import { apiFetch } from "#src/lib/api-helpers";

/**
 * Generic fetch + Zod parse helper shared by all portfolio hooks.
 * Delegates validation to apiFetch's built-in schema parameter.
 * @internal — not exported from the barrel.
 */
export async function fetchAndParse<T>(
  path: string,
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } } },
  errorMessage: string
): Promise<T> {
  try {
    return await apiFetch<T>(path, {}, schema);
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection or if the backend is down.', { cause: error });
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection or if the backend is down.', { cause: error });
    }
    if (error instanceof Error) {
      throw new Error(error.message, { cause: error });
    }
    throw new Error(`${errorMessage}: ${String(error)}`, { cause: error });
  }
}
