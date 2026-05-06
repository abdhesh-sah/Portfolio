import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClientPortal } from "./ClientPortal";
import { Sketchpad } from "./Sketchpad";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock providers and hooks
vi.mock("@tanstack/react-query", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual as Record<string, unknown>,
        useQuery: vi.fn(() => ({ data: null, isLoading: true })),
        useMutation: vi.fn(() => ({ mutate: vi.fn() })),
    };
});

// Mock Framer Motion to avoid issues in test environment
vi.mock("framer-motion", () => ({
    motion: {
        div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>,
    },
    m: {
        div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => <>{children}</>,
}));

// Mock Canvas context
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    scale: vi.fn(),
    arc: vi.fn(),
    strokeRect: vi.fn(),
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;

const queryClient = new QueryClient();

describe("Frontend Components Sanity", () => {
    it("should render ClientPortal with key sections", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <ClientPortal />
            </QueryClientProvider>
        );
        expect(screen.getByText(/Client Portal/i)).toBeDefined();
        expect(screen.getByPlaceholderText(/Paste your token here/i)).toBeDefined();
    });

    it("should render Sketchpad with toolbar", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <Sketchpad />
            </QueryClientProvider>
        );
        expect(screen.getByText(/Sketchpad/i)).toBeDefined();
        expect(screen.getByLabelText(/Drawing tools/i)).toBeDefined();
        expect(screen.getByLabelText(/Pen/i)).toBeDefined();
    });
});
