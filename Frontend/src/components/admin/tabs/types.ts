export type TabKey = "overview" | "analytics" | "messages" | "templates" | "projects" | "skills" | "experiences" | "services" | "seo" | "articles" | "testimonials" | "mindset" | "customization" | "settings" | "case-studies" | "sketchpad" | "subscribers" | "chat-logs" | "newsletter" | "guestbook" | "audit" | "reading-list";

export interface AdminTabProps {
    onNavigate?: (tab: TabKey) => void;
}
