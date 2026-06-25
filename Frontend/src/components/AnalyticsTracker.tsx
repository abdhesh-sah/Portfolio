import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { API_BASE_URL } from "#src/lib/api-helpers";
import * as Sentry from "@sentry/react";
import { trackEngagementMilestone } from "#src/lib/analytics";

// Local cache to prevent double-tracking across remounts within the same session
let lastTrackedPath: string | null = null;

export function AnalyticsTracker() {
    const [location] = useLocation();
    // Tracks whether deep-scroll has already fired for the current route
    const deepScrollFiredRef = useRef<string | null>(null);

    // ─── Effect 1: Virtual pageview on every SPA route change ────────────────
    useEffect(() => {
        // Prevent duplicate tracking for the same path in strict mode or rapid navigation
        if (lastTrackedPath === location) return;
        lastTrackedPath = location;

        // 0. Bot Filtering: Don't track crawlers or automated tools
        if (/bot|crawler|spider|preview|lighthouse|googlebot|bingbot|yandex|slurp|duckduckgo/i.test(navigator.userAgent)) {
            return;
        }

        // 1. Log to our own backend
        const trackPageView = async () => {
            try {
                const userAgent = navigator.userAgent;
                const urlParams = new URLSearchParams(window.location.search);
                const referral = urlParams.get("ref");

                const info = {
                    type: "page_view",
                    path: location,
                    browser: getBrowser(userAgent),
                    os: getOS(userAgent),
                    device: /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop",
                    referral: referral,
                };

                await fetch(`${API_BASE_URL}/api/v1/analytics/track`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(info),
                });
            } catch (err) {
                console.warn("Analytics tracking failed:", err);
                Sentry.captureException(err, {
                    tags: { service: "analytics" },
                    extra: { path: location }
                });
            }
        };

        trackPageView();

        // 2. Log to Google Analytics if gtag is available
        const win = window as unknown as { gtag?: (event: string, action: string, params: Record<string, unknown>) => void };
        if (win.gtag) {
            win.gtag("event", "page_view", {
                page_path: location,
            });
        }

        // 3. ── FIX: Tell Microsoft Clarity about the SPA virtual page change ──
        //    Without this, Clarity groups the entire session under the landing
        //    page URL, making per-page dwell-time data unreliable in an SPA.
        if (window.clarity) {
            window.clarity("set", "pageview", location);
            // Also tag the page name so Clarity filter panel shows readable names
            window.clarity("set", "page", location);
        }
    }, [location]);

    // ─── Effect 2: Deep-scroll (80% depth) per route ───────────────────────────
    //    Fires once per unique route when the visitor has scrolled past 80%
    //    of the page height. Uses a scroll event listener (passive) instead
    //    of an IntersectionObserver sentinel so it works correctly regardless
    //    of layout stacking context or dynamic page heights.
    useEffect(() => {
        // Reset per-route guard when the route changes
        deepScrollFiredRef.current = null;

        const handleScroll = () => {
            // Already fired for this route — bail immediately
            if (deepScrollFiredRef.current === location) return;

            const scrolled = window.scrollY + window.innerHeight;
            const total = document.documentElement.scrollHeight;

            // Guard against tiny/non-scrollable pages (avoid false fires)
            if (total <= window.innerHeight) return;

            const pct = scrolled / total;
            if (pct >= 0.8) {
                deepScrollFiredRef.current = location;
                trackEngagementMilestone("deep_scroll");
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        // Run once on mount in case the page is already scrolled (back-nav)
        handleScroll();

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, [location]);

    return null;
}

// Simple helpers for tracking
function getBrowser(ua: string) {
    if (ua.includes("Edg")) return "Edge"; // Edge UA contains "Edg" (not "Edge") — must check before Chrome
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    return "Unknown";
}

function getOS(ua: string) {
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac OS")) return "MacOS";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
    if (ua.includes("Linux")) return "Linux";
    return "Unknown";
}
