import { API_BASE_URL } from "./api-helpers";
import * as Sentry from "@sentry/react";

export type AnalyticsEvent = {
    type: string;
    path?: string;
    [key: string]: unknown;
};

declare global {
    interface Window {
        gtag?: (command: string, action: string, params?: unknown) => void;
        clarity?: {
            (command: string, ...args: unknown[]): void;
            q?: unknown[][]; // Ensure support for the script initialization queue
        };

        dataLayer?: unknown[];
    }
}

export const trackSPAView = (path: string) => {
    if (typeof window !== 'undefined' && typeof window.clarity === 'function') {
        window.clarity("set", "pageview", path);
    }
};

export function trackEvent(event: AnalyticsEvent) {
    if (typeof window === "undefined") return;

    // Fast bot filtering loop
    if (/bot|crawler|spider|preview|lighthouse|googlebot|bingbot|yandex|slurp|duckduckgo/i.test(navigator.userAgent)) {
        return;
    }

    const userAgent = navigator.userAgent;
    const urlParams = new URLSearchParams(window.location.search);
    const referral = urlParams.get("ref");

    const info = {
        path: window.location.pathname,
        browser: getBrowser(userAgent),
        os: getOS(userAgent),
        device: /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop",
        referral: referral,
        ...event,
    };

    const targetUrl = `${API_BASE_URL}/api/v1/analytics/track`;

    // Hardened Pipeline: Use sendBeacon when page transitions to prevent telemetry dropping
    if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(info)], { type: "application/json" });
        navigator.sendBeacon(targetUrl, blob);
    } else {
        // Safe, non-blocking detached fetch stream fallback
        fetch(targetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(info),
        }).catch((err) => {
            Sentry.captureException(err, { tags: { context: "analytics-network" } });
        });
    }

    // Mirror to Google Analytics 4 (Runs independently of your backend's up/down status)
    if (typeof window.gtag === "function") {
        try {
            window.gtag("event", event.type, event);
        } catch (err) {
            console.error("GA4 Event Failed:", err);
        }
    }
}

export function trackEngagementMilestone(
    milestoneType: "viewed_resume" | "clicked_contact" | "deep_scroll" | "warm_read" | "deep_read"
) {
    if (typeof window === "undefined") return;

    if (typeof window.clarity === "function") {
        window.clarity("set", "LeadIntent", milestoneType);
    }

    if (typeof window.gtag === "function") {
        window.gtag("event", "engagement_milestone", { milestone: milestoneType });
    }
}

export function trackProjectEngagement(
    projectTitle: string,
    level: "warm_read" | "deep_read"
) {
    if (typeof window === "undefined") return;

    if (typeof window.clarity === "function") {
        window.clarity("set", "LeadIntent", level);
        const safeTitle = projectTitle.replace(/[^\w\s-]/g, "").trim().slice(0, 64);
        window.clarity("set", "ProjectTitle", safeTitle);
    }

    if (typeof window.gtag === "function") {
        window.gtag("event", "project_dwell", { level, project: projectTitle });
    }
}

function getBrowser(ua: string) {
    if (ua.includes("Edg")) return "Edge";
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