import { useEffect, useRef } from "react";

export type DwellThreshold = {
    /** Seconds after which the callback fires */
    seconds: number;
    /** Label used for analytics tagging */
    label: string;
};

export interface UseDwellTimeOptions {
    thresholds: DwellThreshold[];
    onMilestone: (label: string) => void;
    key?: string;
    enabled?: boolean;
}

/**
 * useDwellTime
 *
 * Tracks how long the user actively views a page and fires milestone
 * callbacks at configurable time thresholds. Pauses when the tab loses
 * focus (via `visibilitychange`) so AFK time doesn't inflate numbers.
 *
 * Designed for high-value recruiter pages: /project/:id, /resume, /blog/:slug
 *
 * @example
 *   useDwellTime({
 *     thresholds: [{ seconds: 30, label: "warm_read" }, { seconds: 120, label: "deep_read" }],
 *     onMilestone: (label) => trackEngagementMilestone(label as MilestoneType),
 *     key: location.pathname
 *   });
 */
export function useDwellTime({
    thresholds,
    onMilestone,
    key = "global",
    enabled = true,
}: UseDwellTimeOptions) {
    const firedRef = useRef<Set<number>>(new Set());
    const elapsedRef = useRef(0);
    const lastTickRef = useRef<number | null>(null);

    // Maintain highly stable mutable tracks for dynamic configs
    const onMilestoneRef = useRef(onMilestone);
    onMilestoneRef.current = onMilestone;

    const thresholdsRef = useRef(thresholds);
    // Sort thresholds exactly once per configuration mutation to optimize the 1000ms tick path
    thresholdsRef.current = [...thresholds].sort((a, b) => a.seconds - b.seconds);

    useEffect(() => {
        if (!enabled) return;

        // Reset state cleanly whenever the tracking key changes (SPA Navigation) or status changes
        firedRef.current = new Set();
        elapsedRef.current = 0;
        lastTickRef.current = document.visibilityState === "visible"
            ? performance.now()
            : null;

        const tick = () => {
            // Strictly guard against hidden background processing iterations
            if (lastTickRef.current === null || document.visibilityState !== "visible") {
                return;
            }

            const now = performance.now();
            elapsedRef.current += (now - lastTickRef.current) / 1000;
            lastTickRef.current = now;

            // Read the pre-sorted array directly from reference
            for (const { seconds, label } of thresholdsRef.current) {
                if (
                    elapsedRef.current >= seconds &&
                    !firedRef.current.has(seconds)
                ) {
                    firedRef.current.add(seconds);
                    onMilestoneRef.current(label);
                }
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                lastTickRef.current = performance.now();
            } else {
                // Safely commit current active deltas before discarding thread frames
                tick();
                lastTickRef.current = null;
            }
        };

        const interval = setInterval(tick, 1000);
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [enabled, key]); // Adding 'key' completely eliminates cross-page state bleeding
}
