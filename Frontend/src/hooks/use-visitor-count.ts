import { useEffect, useRef, useState, useCallback } from "react";
import { API_BASE_URL } from "#src/lib/api-helpers";

const API_URL = API_BASE_URL;

export function useVisitorCount() {
    const [visitorCount, setVisitorCount] = useState<number>(0);
    const [error, setError] = useState<Error | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const fetchPolling = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/v1/analytics/live-visitors/count`);
            if (!response.ok) throw new Error("Fallback polling failed");
            const data = await response.json();
            setVisitorCount(data.count);
            setLastUpdated(new Date());
            setIsPolling(true);
        } catch (err) {
            console.error("Visitor count polling error:", err);
        }
    }, []);

    useEffect(() => {
        let retryCount = 0;
        let pollInterval: NodeJS.Timeout | null = null;
        const maxRetries = 3;

        const connect = () => {
            if (eventSourceRef.current) eventSourceRef.current.close();
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            const streamUrl = `${API_URL}/api/v1/analytics/live-visitors`;

            const eventSource = new EventSource(streamUrl, {
                withCredentials: true,
            });
            eventSourceRef.current = eventSource;

            eventSource.addEventListener("count", (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data);
                    if (typeof data.count === "number") {
                        setVisitorCount(data.count);
                        setLastUpdated(new Date());
                        setIsPolling(false);
                        setError(null);
                        retryCount = 0;
                        if (pollInterval) {
                            clearInterval(pollInterval);
                            pollInterval = null;
                        }
                    }
                } catch (err) {
                    console.error("Failed to parse visitor SSE data:", err);
                }
            });

            eventSource.onerror = () => {
                console.error("Visitor SSE Error");
                eventSourceRef.current?.close();
                eventSourceRef.current = null;

                if (retryCount < maxRetries) {
                    retryCount++;
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
                    reconnectTimeoutRef.current = setTimeout(connect, delay);
                } else {
                    setError(new Error("SSE failed after retries"));
                    if (!pollInterval) {
                        fetchPolling();
                        pollInterval = setInterval(fetchPolling, 120000);
                    }
                }
            };
        };

        connect();

        return () => {
            eventSourceRef.current?.close();
            eventSourceRef.current = null;
            if (pollInterval) clearInterval(pollInterval);
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };
    }, [fetchPolling]);

    return { count: visitorCount, error, isPolling, lastUpdated };
}
