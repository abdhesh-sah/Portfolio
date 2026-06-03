import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import { apiFetch, setCsrfToken } from "#src/lib/api-helpers";
import { useQueryClient } from "@tanstack/react-query";
import { AUTH_QUERY_KEY } from "#src/lib/query-keys";

interface AuthUser {
    username: string;
    [key: string]: unknown;
}

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: AuthUser | null;
    login: (userData?: AuthUser) => void;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);
    const queryClient = useQueryClient();

    const checkAuth = useCallback(async () => {
        try {
            const data = await apiFetch("/api/v1/auth/status");
            if (data.csrfToken) {
                setCsrfToken(data.csrfToken);
            }
            if (data.authenticated) {
                setUser(data.user || { username: 'Admin' });
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, [queryClient]);

    const login = (userData?: AuthUser) => {
        localStorage.removeItem("portfolio_admin_last_exit");
        if (userData) setUser(userData);
        setIsAuthenticated(true);
        queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    };

    const logout = useCallback(async () => {
        try {
            await apiFetch("/api/v1/auth/logout", {
                method: "POST"
            });
        } finally {
            setIsAuthenticated(false);
            setUser(null);
            localStorage.removeItem("portfolio_admin_last_exit");
            queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
        }
    }, [queryClient]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Listen for session-expired events from apiFetch
    useEffect(() => {
        const handler = () => { logout(); };
        window.addEventListener("auth:session-expired", handler);
        return () => window.removeEventListener("auth:session-expired", handler);
    }, [logout]);

    // Session Lock / Timeout Logic (5 minutes absence)
    useEffect(() => {
        if (!isAuthenticated) return;

        const TIMEOUT_MS = 5 * 60 * 1000;

        const checkTimeout = () => {
            const lastExit = localStorage.getItem("portfolio_admin_last_exit");
            if (lastExit) {
                const elapsed = Date.now() - parseInt(lastExit, 10);
                if (elapsed > TIMEOUT_MS) {
                    logout();
                    return true;
                }
            }
            return false;
        };

        const handleExit = () => {
            if (document.visibilityState === 'hidden') {
                localStorage.setItem("portfolio_admin_last_exit", Date.now().toString());
            } else {
                if (!checkTimeout()) {
                    localStorage.removeItem("portfolio_admin_last_exit");
                }
            }
        };

        checkTimeout();

        window.addEventListener("visibilitychange", handleExit);
        const focusHandler = () => checkTimeout();
        window.addEventListener("focus", focusHandler);

        return () => {
            window.removeEventListener("visibilitychange", handleExit);
            window.removeEventListener("focus", focusHandler);
        };
    }, [isAuthenticated, logout]);

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const [, navigate] = useLocation();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate("/admin/login", { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!isAuthenticated) return null;

    return <>{children}</>;
}
