import { useState, useEffect, lazy, Suspense } from "react";
import { useMessageStream } from "#src/hooks/use-message-stream";
import "#src/styles/admin.css";
import { TabErrorBoundary } from "#src/components/admin/TabErrorBoundary";
import AdminLayout from "#src/components/admin/AdminLayout";

// Lazy-loaded Tab Components
const OverviewTab = lazy(() => import("#src/components/admin/tabs/OverviewTab").then(m => ({ default: m.OverviewTab })));
const AnalyticsOverview = lazy(() => import("#src/components/admin/AnalyticsOverview").then(m => ({ default: m.AnalyticsOverview })));
const EmailTemplatesTab = lazy(() => import("#src/components/admin/tabs/EmailTemplatesTab").then(m => ({ default: m.EmailTemplatesTab })));
const MessagesTab = lazy(() => import("#src/components/admin/tabs/MessagesTab").then(m => ({ default: m.MessagesTab })));
const ProjectsTab = lazy(() => import("#src/components/admin/tabs/ProjectsTab").then(m => ({ default: m.ProjectsTab })));
const SkillsTab = lazy(() => import("#src/components/admin/tabs/SkillsTab").then(m => ({ default: m.SkillsTab })));
const ExperiencesTab = lazy(() => import("#src/components/admin/tabs/ExperiencesTab").then(m => ({ default: m.ExperiencesTab })));
const ServicesTab = lazy(() => import("#src/components/admin/tabs/ServicesTab").then(m => ({ default: m.ServicesTab })));
const SeoTab = lazy(() => import("#src/components/admin/tabs/SeoTab").then(m => ({ default: m.SeoTab })));
const ArticlesTab = lazy(() => import("#src/components/admin/tabs/ArticlesTab").then(m => ({ default: m.ArticlesTab })));
const TestimonialsTab = lazy(() => import("#src/components/admin/tabs/TestimonialsTab").then(m => ({ default: m.TestimonialsTab })));
const AuditLogTab = lazy(() => import("#src/components/admin/tabs/AuditLogTab").then(m => ({ default: m.AuditLogTab })));
const GuestbookTab = lazy(() => import("#src/components/admin/tabs/GuestbookTab").then(m => ({ default: m.GuestbookTab })));
const MindsetTab = lazy(() => import("#src/components/admin/tabs/MindsetTab").then(m => ({ default: m.MindsetTab })));
const CustomizationTab = lazy(() => import("#src/components/admin/tabs/CustomizationTab").then(m => ({ default: m.CustomizationTab })));
const SettingsTab = lazy(() => import("#src/components/admin/tabs/SettingsTab").then(m => ({ default: m.SettingsTab })));
const CaseStudiesTab = lazy(() => import("#src/components/admin/tabs/CaseStudiesTab").then(m => ({ default: m.CaseStudiesTab })));

const SketchpadTab = lazy(() => import("#src/components/admin/tabs/SketchpadTab").then(m => ({ default: m.SketchpadTab })));
const SubscribersTab = lazy(() => import("#src/components/admin/tabs/SubscribersTab").then(m => ({ default: m.SubscribersTab })));
const ChatLogTab = lazy(() => import("#src/components/admin/tabs/ChatLogTab").then(m => ({ default: m.ChatLogTab })));
const NewsletterTab = lazy(() => import("#src/components/admin/tabs/NewsletterTab"));
const ReadingListTab = lazy(() => import("#src/components/admin/tabs/ReadingListTab").then(m => ({ default: m.ReadingListTab })));

type Tab = "overview" | "analytics" | "messages" | "templates" | "projects" | "skills" | "experiences" | "services" | "seo" | "articles" | "testimonials" | "guestbook" | "audit" | "mindset" | "customization" | "settings" | "case-studies" | "sketchpad" | "subscribers" | "chat-logs" | "newsletter" | "reading-list";

const TAB_LABELS: Record<Tab, string> = {
    overview: "OVERVIEW",
    analytics: "ANALYTICS",
    messages: "MESSAGES",
    templates: "TEMPLATES",
    projects: "PROJECTS",
    skills: "SKILLS",
    experiences: "EXPERIENCES",
    services: "SERVICES",
    seo: "SEO",
    articles: "ARTICLES",
    testimonials: "TESTIMONIALS",
    guestbook: "GUESTBOOK",
    audit: "AUDIT LOG",
    "case-studies": "CASE STUDIES",

    sketchpad: "SKETCHPAD",
    mindset: "MINDSET",
    customization: "CUSTOMIZATION",
    settings: "SITE SETTINGS",
    subscribers: "SUBSCRIBERS",
    "chat-logs": "CHAT LOGS",
    newsletter: "NEWSLETTER",
    "reading-list": "READING LIST",
};

export default function AdminDashboard() {
    const [tab, setTab] = useState<Tab>("overview");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const stored = localStorage.getItem("admin:sidebarCollapsed");
        return stored === "true";
    });

    useEffect(() => {
        localStorage.setItem("admin:sidebarCollapsed", String(sidebarCollapsed));
    }, [sidebarCollapsed]);

    // SSE real-time notifications
    const { unreadCount, resetUnread } = useMessageStream(true);

    // Reset unread count when switching to messages tab
    useEffect(() => {
        if (tab === "messages") resetUnread();
    }, [tab, resetUnread]);

    // Keyboard Shortcuts: G + Key
    const [gKeyPressed, setGKeyPressed] = useState(false);
    const [shortcutHint, setShortcutHint] = useState<string | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key.toLowerCase() === 'g') {
                setGKeyPressed(true);
                // Reset G key after 2 seconds if no second key is pressed
                setTimeout(() => setGKeyPressed(false), 2000);
                return;
            }

            if (gKeyPressed) {
                const key = e.key.toLowerCase();
                let targetTab: Tab | null = null;
                let label = "";

                switch (key) {
                    case 'o': targetTab = 'overview'; label = "Overview"; break;
                    case 'm': targetTab = 'messages'; label = "Messages"; break;
                    case 'p': targetTab = 'projects'; label = "Projects"; break;
                    case 'k': targetTab = 'skills'; label = "Skills"; break;
                    case 'a': targetTab = 'articles'; label = "Articles"; break;
                    case 'e': targetTab = 'experiences'; label = "Experiences"; break;
                    case 'n': targetTab = 'analytics'; label = "Analytics"; break;
                    case 's': targetTab = 'settings'; label = "Site Settings"; break;
                    case 'r': targetTab = 'subscribers'; label = "Subscribers"; break;
                    case 'w': targetTab = 'newsletter'; label = "Newsletter"; break;
                    case 'l': targetTab = 'chat-logs'; label = "Chat Logs"; break;
                    case '?': setShortcutHint("SHORTCUTS: G+O (Overview), G+M (Messages), G+P (Projects), G+K (Skills), G+A (Articles), G+E (Experiences), G+N (Analytics), G+S (Settings), G+R (Subscribers), G+W (Newsletter), G+L (Chat Logs)"); break;
                }

                if (targetTab) {
                    setTab(targetTab);
                    setShortcutHint(`Navigated to ${label}`);
                    setGKeyPressed(false);
                }
            }

            if (e.key === 'Escape') {
                setGKeyPressed(false);
                setShortcutHint(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gKeyPressed]);

    // Clear shortcut hint after 3 seconds
    useEffect(() => {
        if (shortcutHint) {
            const timer = setTimeout(() => setShortcutHint(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [shortcutHint]);

    return (
        <AdminLayout
            activeTab={tab}
            onNavigate={(newTab) => setTab(newTab as Tab)}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            unreadCount={unreadCount}
        >
            {/* Shortcut Hint Toast */}
            {gKeyPressed && (
                <div className="fixed bottom-24 right-10 z-[100] nm-float px-6 py-3 rounded-2xl border border-purple-500/30 flex items-center gap-4 bg-purple-500/10 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-[10px] font-black tracking-[0.3em] uppercase text-purple-400">Shortcut Mode Active: Press key...</span>
                </div>
            )}

            {shortcutHint && (
                <div className="fixed bottom-36 right-10 z-[100] nm-inset px-6 py-3 rounded-2xl border border-[var(--nm-light)] flex items-center gap-4 animate-in fade-in duration-300">
                    <span className="text-[9px] font-bold tracking-widest text-[var(--admin-text-secondary)] uppercase">{shortcutHint}</span>
                </div>
            )}

            <Suspense fallback={
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-[var(--nm-accent)] border-t-transparent rounded-full animate-spin" />
                </div>
            }>
                <TabErrorBoundary tabName={TAB_LABELS[tab]}>
                    {tab === "overview" && <OverviewTab onNavigate={setTab} />}
                    {tab === "analytics" && <AnalyticsOverview />}
                    {tab === "messages" && <MessagesTab />}
                    {tab === "templates" && <EmailTemplatesTab />}
                    {tab === "projects" && <ProjectsTab />}
                    {tab === "skills" && <SkillsTab />}
                    {tab === "experiences" && <ExperiencesTab />}
                    {tab === "seo" && <SeoTab />}
                    {tab === "services" && <ServicesTab />}
                    {tab === "articles" && <ArticlesTab />}
                    {tab === "testimonials" && <TestimonialsTab />}
                    {tab === "guestbook" && <GuestbookTab />}
                    {tab === "audit" && <AuditLogTab />}
                    {tab === "case-studies" && <CaseStudiesTab />}

                    {tab === "sketchpad" && <SketchpadTab />}
                    {tab === "subscribers" && <SubscribersTab />}
                    {tab === "newsletter" && <NewsletterTab />}
                    {tab === "chat-logs" && <ChatLogTab />}
                    {tab === "mindset" && <MindsetTab />}
                    {tab === "customization" && <CustomizationTab />}
                    {tab === "settings" && <SettingsTab />}
                    {tab === "reading-list" && <ReadingListTab />}
                </TabErrorBoundary>
            </Suspense>
        </AdminLayout>
    );
}
