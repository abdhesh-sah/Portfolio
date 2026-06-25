import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "#src/components/ui/dialog";
import { Input } from "#src/components/ui/input";
import { 
  Search, FileText, Code, FolderGit2, ArrowRight, Home, 
  Mail, Palette, Briefcase, Star, Layers, MessageSquare,
  LayoutDashboard, Users, Settings, Database, Zap, Download,
  Copy
} from "lucide-react";
import { useLocation } from "wouter";
import { m, AnimatePresence } from "framer-motion";
import { useProjects, useArticles, useAuth } from "#src/hooks/use-portfolio";
import { usePersona } from "#src/hooks/use-persona";
import { useSiteSettings } from "#src/hooks/use-site-settings";
import { useTheme } from "#src/components/theme-provider";
import { useToast } from "#src/hooks/use-toast";
import { TOGGLE_COMMAND_PALETTE } from "#src/hooks/use-command-palette";

interface SearchResultItem {
  id: string;
  title: string;
  type: "navigation" | "action" | "project" | "article" | "admin";
  icon: React.ElementType;
  href?: string;
  action?: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, setLocation] = useLocation();
  const { setTheme, theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const { data: settings } = useSiteSettings();
  const { toast } = useToast();
  const { toggleDevMode } = usePersona();

  const { data: projects = [] } = useProjects();
  const { data: articles = [] } = useArticles("published");

  // Handle keyboard shortcut (Ctrl+K or Cmd+K) and custom events
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };

    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent?.detail?.open !== undefined) {
        setOpen(customEvent.detail.open);
      } else {
        setOpen((o) => !o);
      }
    };

    const handleDevMode = () => {
      toggleDevMode(true);
      toast({ title: "Dev Mode Activated", description: "Voice command recognized. System transformation initiated." });
    };

    window.addEventListener(TOGGLE_COMMAND_PALETTE, handleToggle);
    window.addEventListener('activate-dev-mode', handleDevMode);
    document.addEventListener("keydown", down);
    return () => {
      window.removeEventListener(TOGGLE_COMMAND_PALETTE, handleToggle);
      window.removeEventListener('activate-dev-mode', handleDevMode);
      document.removeEventListener("keydown", down);
    };
  }, []);

  // Filter items based on query
  const searchResults = useCallback((): SearchResultItem[] => {
    const staticCommands = [
      { id: "home", title: "Go Home", type: "navigation" as const, icon: Home, href: "/" },
      { id: "projects-nav", title: "Browse Projects", type: "navigation" as const, icon: FolderGit2, href: "/#projects" },
      { id: "skills-nav", title: "Jump to Skills", type: "navigation" as const, icon: Zap, href: "/#skills" },
      { id: "experience-nav", title: "Jump to Experience", type: "navigation" as const, icon: Briefcase, href: "/#experience" },
      { id: "contact-nav", title: "Get in Touch", type: "navigation" as const, icon: Mail, href: "/#contact" },
      { id: "copy-email", title: "Copy Email Address", type: "action" as const, icon: Copy, action: () => {
        const email = settings?.socialEmail || "contact@portfolio.dev";
        navigator.clipboard.writeText(email);
        toast({ title: "Email Copied", description: email });
      }},
      { id: "download-resume", title: "Download Resume", type: "action" as const, icon: Download, action: () => {
        if (!settings?.resumeUrl) {
          toast({ title: "Resume Not Available", description: "No resume link configured in settings.", variant: "destructive" });
        } else if (settings.resumeUrl.startsWith("http") || settings.resumeUrl.endsWith(".pdf")) {
          window.open(settings.resumeUrl, '_blank');
        } else {
          setLocation(settings.resumeUrl);
        }
      }},
      { id: "testimonials-nav", title: "View Testimonials", type: "navigation" as const, icon: Star, href: "/#testimonials" },
      { id: "stack-nav", title: "Modern Tech Stack", type: "navigation" as const, icon: Layers, href: "/#stack" },
      { id: "guestbook-nav", title: "Sign Guestbook", type: "navigation" as const, icon: MessageSquare, href: "/guestbook" },
      { id: "theme", title: `Toggle ${theme === "dark" ? "Light" : "Dark"} Theme`, type: "action" as const, icon: Palette, action: () => setTheme(theme === "dark" ? "light" : "dark") },
    ];

    const adminCommands = isAuthenticated ? [
      { id: "admin-dash", title: "Admin: Dashboard", type: "admin" as const, icon: LayoutDashboard, href: "/admin" },
      { id: "admin-subs", title: "Admin: Manage Subscribers", type: "admin" as const, icon: Users, href: "/admin?tab=subscribers" },
      { id: "admin-chat", title: "Admin: Chat Conversation Logs", type: "admin" as const, icon: MessageSquare, href: "/admin?tab=chat-logs" },
      { id: "admin-settings", title: "Admin: Site Settings", type: "admin" as const, icon: Settings, href: "/admin?tab=settings" },
      { id: "admin-audit", title: "Admin: Security Audit Log", type: "admin" as const, icon: Database, href: "/admin?tab=audit" },
    ] : [];

    const allStatic = [...staticCommands, ...adminCommands];

    if (!query.trim()) return allStatic;

    const lowerQuery = query.toLowerCase();

    const filteredProjects = projects
      .filter((p) => p.title.toLowerCase().includes(lowerQuery) || p.description?.toLowerCase().includes(lowerQuery))
      .map((p) => ({
        id: `project-${p.id}`,
        title: p.title,
        type: "project" as const,
        icon: Code,
        href: `/project/${p.id}`,
      }));

    const filteredArticles = articles
      .filter((a) => a.title.toLowerCase().includes(lowerQuery) || a.excerpt?.toLowerCase().includes(lowerQuery))
      .map((a) => ({
        id: `article-${a.id}`,
        title: a.title,
        type: "article" as const,
        icon: FileText,
        href: `/blog/${a.slug}`,
      }));

    const filteredStatic = allStatic.filter(c => c.title.toLowerCase().includes(lowerQuery));

    return [...filteredStatic, ...filteredProjects, ...filteredArticles].slice(0, 10);
  }, [query, projects, articles, theme, setTheme, isAuthenticated]);

  const results = searchResults();

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  const handleSelect = useCallback((item: SearchResultItem) => {
    setOpen(false);
    if (item.action) {
      item.action();
    } else if (item.href) {
      setLocation(item.href);
    }
  }, [setLocation]);

  // Handle keyboard navigation within the results list
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + results.length) % results.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, results, handleSelect]);

  // Reset query when closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => setQuery(""), 200);
    }
  }, [open]);

  // Secret command triggers
  useEffect(() => {
    const lowerQuery = query.toLowerCase().trim();
    if (lowerQuery === "sudo dev-mode" || lowerQuery === "/hack") {
      toggleDevMode(true);
      setQuery("");
      setOpen(false);
      toast({ title: "Dev Mode Activated", description: "You found the secret entry. System transformation initiated." });
    } else if (lowerQuery === "sudo logout") {
      toggleDevMode(false);
      setQuery("");
      setOpen(false);
    }
  }, [query, toggleDevMode, toast]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-[#0A0A0B]/95 backdrop-blur-2xl border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.5)] rounded-2xl">
        <div className="flex items-center px-4 py-3 border-b border-white/5">
          <Search className="w-5 h-5 text-white/30 shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="border-0 bg-transparent focus-visible:ring-0 text-white placeholder:text-white/20 h-10 w-full text-lg rounded-none shadow-none px-4"
            autoFocus
          />
          <m.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="hidden sm:flex items-center gap-2 shrink-0 text-[10px] uppercase tracking-tighter text-white/20 font-bold"
          >
            <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5">esc</span>
            <span>to close</span>
          </m.div>
        </div>

        <div className="max-h-[450px] overflow-y-auto p-2 scrollbar-hide">
          <AnimatePresence mode="wait">
            {results.length === 0 ? (
              <m.div
                key="no-results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="py-20 text-center flex flex-col items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <Search className="w-6 h-6 text-white/10" />
                </div>
                <p className="text-white/30 text-sm">
                  No matches found for <span className="text-white/60 font-medium">"{query}"</span>
                </p>
              </m.div>
            ) : (
              <m.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-0.5"
              >
                {results.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center justify-between w-full p-2.5 rounded-xl group transition-all duration-200 text-left relative ${
                        isSelected ? "bg-primary/10" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      {isSelected && (
                        <m.div 
                          layoutId="active-bg"
                          className="absolute inset-0 bg-primary/20 rounded-xl"
                          initial={false}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      
                      <div className="flex items-center gap-3 w-full min-w-0 relative z-10">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-primary text-white" : "bg-white/5 text-white/40"
                        }`}>
                          <item.icon className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`font-medium truncate transition-colors ${
                            isSelected ? "text-white" : "text-white/60"
                          }`}>
                            {item.title}
                          </span>
                          <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 font-bold border ${
                            isSelected ? "bg-primary/20 border-primary/30 text-primary" : "bg-white/5 border-white/5 text-white/20"
                          }`}>
                            {item.type}
                          </span>
                        </div>
                      </div>

                      <div className="relative z-10">
                        {isSelected ? (
                          <div className="flex items-center gap-1.5 text-[10px] text-primary/60 font-bold uppercase tracking-tighter">
                            <span>Open</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 bg-white/5 rounded flex items-center justify-center">
                             <ArrowRight className="w-3 h-3 text-white/10" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </m.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-3 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4 text-[10px] text-white/20 font-bold uppercase tracking-[0.1em]">
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-0.5">
                <kbd className="bg-white/5 px-1 rounded">↑</kbd>
                <kbd className="bg-white/5 px-1 rounded">↓</kbd>
              </span>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="bg-white/5 px-1 rounded">↵</kbd>
              <span>Select</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] text-white/10 font-medium">
            <Code className="w-3 h-3" />
            <span>Power User Mode</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

