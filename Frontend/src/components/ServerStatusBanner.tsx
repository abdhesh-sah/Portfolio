import { useState, useEffect, useRef } from "react";
import { useServerStatus, type ServerStatus } from "#src/hooks/use-server-status";
import { m, AnimatePresence } from "framer-motion";

const MESSAGES: Record<Exclude<ServerStatus, "online" | "checking">, { text: string; icon: string }> = {
  waking: {
    text: "Server is waking up — hang tight, this usually takes ~30-60 seconds…",
    icon: "⏳",
  },
  offline: {
    text: "Server is currently offline. Retrying automatically…",
    icon: "⚠️",
  },
};

/**
 * Fixed-top banner that shows while the backend is cold-starting or unreachable.
 * Automatically disappears with a smooth exit when /health returns 200 OK.
 */
export function ServerStatusBanner() {
  const status = useServerStatus();
  const [seconds, setSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  const visible = status === "waking" || status === "offline";

  useEffect(() => {
    if (visible) {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }
      const interval = setInterval(() => {
        setSeconds(Math.floor((Date.now() - (startTimeRef.current || 0)) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      startTimeRef.current = null;
      setSeconds(0);
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          key="server-status"
          role="status"
          aria-live="polite"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className={`server-status-banner ${status === "offline" ? "server-status-banner--offline" : "server-status-banner--waking"}`}
        >
          <div className="flex items-center gap-3">
            <span className="server-status-banner__icon">{MESSAGES[status].icon}</span>
            <span className="server-status-banner__text transition-all">
              {MESSAGES[status].text}
              <span className="ml-3 px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] tabular-nums inline-flex items-center gap-2 border border-white/5">
                {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
                <span className="server-status-banner__pulse scale-75" />
              </span>
            </span>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
