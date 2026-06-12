export const QUERY_KEYS = {
    auth: () => ["/api/v1/auth/status"] as const,
    settings: () => ["/api/v1/settings"] as const,
    projects: {
        all: ["projects"] as const,
        list: (sortBy: string = "default") => ["projects", sortBy] as const,
        detail: (id: number | null) => ["project", id] as const,
        admin: ["admin-projects"] as const,
    },
    skills: {
        all: ["skills"] as const,
        connections: ["skill-connections"] as const,
        admin: ["admin-skills"] as const,
    },
    mindset: {
        all: ["mindset"] as const,
        admin: ["admin-mindset"] as const,
    },
    messages: {
        all: ["messages"] as const,
    },
    subscribers: {
        all: ["subscribers"] as const,
    },
    chat: {
        logs: ["admin-chat-logs"] as const,
    },
    articles: {
        all: ["articles"] as const,
        list: (status?: string) => status ? (["articles", status] as const) : (["articles"] as const),
        detail: (id: number | string) => ["articles", id] as const,
        search: (q: string) => ["articles", "search", q] as const,
        reactions: (slug: string) => ["article-reactions", slug] as const,
    },
    experiences: {
        all: ["/api/v1/experiences"] as const,
        admin: ["admin-experiences"] as const,
    },
    services: {
        all: ["services"] as const,
        admin: ["admin-services"] as const,
    },
    testimonials: {
        all: ["/api/v1/testimonials"] as const,
        admin: ["admin-testimonials"] as const,
    },
    github: {
        contributions: ["github-contributions"] as const,
        latestCommit: ["latest-commit"] as const,
    },
    system: {
        status: ["server-status"] as const,
        visitorCount: ["visitor-count"] as const,
    },
    seo: (slug?: string) => slug ? (["seo", slug] as const) : (["seo"] as const),
    seoSettings: ["seo-settings"] as const,
    guestbook: {
        all: ["guestbook"] as const,
        admin: ["guestbook", "admin"] as const,
    },
    analytics: {
        summary: ["analytics-summary"] as const,
        vitals: (days: number) => ["vitals-summary", days] as const,
    },
    caseStudies: {
        all: ["case-studies"] as const,
        detail: (slug: string) => ["case-study", slug] as const,
        admin: ["admin-case-studies"] as const,
    },
    sketchpad: {
        admin: ["admin-sketchpad"] as const,
    },
    clients: {
        all: ["admin-clients"] as const,
        projects: (id: number) => ["admin-client-projects", id] as const,
        feedback: (projectId: number) => ["admin-client-feedback", projectId] as const,
    },
} as const;

export const AUTH_QUERY_KEY = QUERY_KEYS.auth();
