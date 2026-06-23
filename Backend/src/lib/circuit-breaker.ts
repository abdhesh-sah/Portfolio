import { checkDatabaseHealth } from "../db.js";
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
 */

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

const HEALTH_CHECK_INTERVAL_MS = 15_000;   // Check DB health every 15 seconds
const FAILURE_THRESHOLD = 3;               // Open circuit after 3 consecutive failures
const RECOVERY_TIMEOUT_MS = 30_000;        // Try half-open after 30 seconds

let state: CircuitState = "CLOSED";
let consecutiveFailures = 0;
let lastFailureTime = 0;
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;

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
            return true; // Allow one request through
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
 * Starts a background health check loop that updates the circuit state.
 * This runs independently of request traffic.
 */
export function startHealthMonitor(): void {
    if (healthCheckTimer) return; // Already running

    healthCheckTimer = setInterval(async () => {
        if (state === "CLOSED") return;
        try {
            const health = await checkDatabaseHealth();
            if (health.healthy) {
                recordSuccess();
            } else {
                recordFailure();
            }
        } catch {
            recordFailure();
        }
    }, HEALTH_CHECK_INTERVAL_MS);

    // Don't block process shutdown
    healthCheckTimer.unref();
    logger.info({ context: "circuit-breaker" }, "Database health monitor started");
}

export function stopHealthMonitor(): void {
    if (healthCheckTimer) {
        clearInterval(healthCheckTimer);
        healthCheckTimer = null;
    }
}
