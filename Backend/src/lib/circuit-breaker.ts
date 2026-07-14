import { logger } from "./logger.js";

/**
 * Database Circuit Breaker
 *
 * Tracks database availability using a simple state machine:
 * - CLOSED (normal): All requests pass through to DB.
 * - OPEN (DB down): Requests are rejected immediately with 503.
 * - HALF_OPEN (testing): One probe request is allowed through to check if DB has recovered.
 *
 * This prevents cascading failures and avoids hammering a dead database
 * with hundreds of failing queries per second.
 *
 * Recovery is REACTIVE — no background polling timer.
 * When the circuit is OPEN, isDatabaseAvailable() transitions to HALF_OPEN
 * automatically after RECOVERY_TIMEOUT_MS. The next real request then acts
 * as the probe: if it succeeds, recordSuccess() closes the circuit; if it
 * fails, recordFailure() keeps it open and resets the timeout.
 * This avoids any periodic Postgres queries that would prevent Neon from
 * suspending compute during idle periods.
 */

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

const FAILURE_THRESHOLD = 3;           // Open circuit after 3 consecutive failures
const RECOVERY_TIMEOUT_MS = 30_000;    // Try half-open after 30 seconds

let state: CircuitState = "CLOSED";
let consecutiveFailures = 0;
let lastFailureTime = 0;

export function getCircuitState(): CircuitState {
    return state;
}

export function isDatabaseAvailable(): boolean {
    if (state === "CLOSED") return true;

    if (state === "OPEN") {
        // Check if enough time has passed to try half-open
        if (Date.now() - lastFailureTime >= RECOVERY_TIMEOUT_MS) {
            state = "HALF_OPEN";
            logger.info({ context: "circuit-breaker" }, "Circuit state: HALF_OPEN (testing recovery)");
            return true; // Allow one request through as the probe
        }
        return false;
    }

    // HALF_OPEN — allow the probe request
    return true;
}

export function recordSuccess(): void {
    if (state === "HALF_OPEN" || state === "OPEN") {
        logger.info({ context: "circuit-breaker" }, "Circuit state: CLOSED (database recovered)");
    }
    state = "CLOSED";
    consecutiveFailures = 0;
}

export function recordFailure(): void {
    consecutiveFailures++;
    lastFailureTime = Date.now();

    if (consecutiveFailures >= FAILURE_THRESHOLD && state !== "OPEN") {
        state = "OPEN";
        logger.error(
            { context: "circuit-breaker", failures: consecutiveFailures },
            `Circuit state: OPEN (${consecutiveFailures} consecutive failures — blocking DB requests)`
        );
    }
}

/**
 * No-op — kept so callers in index.ts don't need changes.
 * Recovery is now fully reactive; no background timer is started.
 */
export function startHealthMonitor(): void {
    logger.info({ context: "circuit-breaker" }, "Circuit breaker ready (reactive mode — no background polling)");
}

/**
 * No-op — kept so callers in index.ts don't need changes.
 */
export function stopHealthMonitor(): void {
    // Nothing to tear down
}
