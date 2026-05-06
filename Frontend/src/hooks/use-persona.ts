import { useState, useEffect } from "react";

export function usePersona() {
    const [isDevMode, setIsDevMode] = useState(() => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem("portfolio_dev_mode") === "true";
    });

    const toggleDevMode = (enabled?: boolean) => {
        const newState = enabled !== undefined ? enabled : !isDevMode;
        setIsDevMode(newState);
        localStorage.setItem("portfolio_dev_mode", String(newState));
    };

    // Reflect dev mode in body class for global styling
    useEffect(() => {
        if (isDevMode) {
            document.body.classList.add("dev-mode-active");
        } else {
            document.body.classList.remove("dev-mode-active");
        }
    }, [isDevMode]);

    // Handle global dev-mode activation events
    useEffect(() => {
        const handleActivate = () => toggleDevMode(true);
        window.addEventListener('activate-dev-mode', handleActivate);
        return () => window.removeEventListener('activate-dev-mode', handleActivate);
    }, [toggleDevMode]);

    return {
        isDevMode,
        toggleDevMode
    };
}
