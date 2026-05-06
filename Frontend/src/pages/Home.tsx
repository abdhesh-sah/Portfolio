import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import Navbar from "#src/components/Navbar";
import Hero from "#src/components/Hero";
import { SEO } from "#src/components/SEO";
import SectionDivider from "#src/components/SectionDivider";
import { ErrorBoundary } from "#src/components/ErrorBoundary";
import { useScrollStore } from "#src/hooks/use-scroll-store";
import { useSiteSettings } from "#src/hooks/use-site-settings";
import { DEFAULT_SECTION_ORDER } from "#shared";
import React from "react";


// Lazy-load below-the-fold sections to reduce initial bundle
const About = lazy(() => import("#src/components/About"));
const Skills = lazy(() => import("#src/components/Skills"));
const WhyHireMe = lazy(() => import("#src/components/WhyHireMe"));
const Services = lazy(() => import("#src/components/Services"));
const EngineeringMindset = lazy(() => import("#src/components/EngineeringMindset"));
const Projects = lazy(() => import("#src/components/Projects"));
const CodeAndPractice = lazy(() => import("#src/components/CodeAndPractice"));
const Experience = lazy(() => import("#src/components/Experience"));
const Testimonials = lazy(() => import("#src/components/Testimonials"));
const Contact = lazy(() => import("#src/components/Contact"));
const Footer = lazy(() => import("#src/components/Footer"));
const BackToTop = lazy(() => import("#src/components/BackToTop"));
const SectionReveal = lazy(() => import("#src/components/animations/Reveal"));
const Guestbook = lazy(() => import("#src/components/Guestbook").then(m => ({ default: m.Guestbook })));
import { GithubHeatmap } from "#src/components/GithubHeatmap";
import { ReadingList } from "#src/components/ReadingList";
import { LiveActivityTicker } from "#src/components/LiveActivityTicker";


// Skeleton loading states that match section shapes
function SectionFallback() {
  return (
    <div className="section-container">
      <div className="space-y-6 animate-pulse">
        {/* Heading skeleton */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-32 rounded-full bg-white/5" />
          <div className="h-10 w-64 rounded-lg bg-white/5" />
          <div className="h-4 w-96 max-w-full rounded bg-white/[0.03]" />
        </div>
        {/* Content skeleton */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
              <div className="h-40 bg-white/5" />
              <div className="p-5 space-y-3">
                <div className="h-4 w-3/4 bg-white/5 rounded" />
                <div className="h-3 w-full bg-white/[0.03] rounded" />
                <div className="h-3 w-2/3 bg-white/[0.03] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


import { SuspenseErrorBoundary } from "#src/components/SuspenseErrorBoundary";

function SafeSection({ children, name }: { children: React.ReactNode, name: string }) {
  return (
    <SuspenseErrorBoundary fallback={
      <div className="section-container py-16 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-8 rounded-2xl bg-destructive/10 border border-destructive/20">
          <h3 className="text-xl font-bold text-destructive">Failed to load the {name} module</h3>
          <p className="text-sm text-foreground/60">An internal error occurred. Our team has been notified. We apologize for the inconvenience.</p>
        </div>
      </div>
    }>
      <Suspense fallback={<SectionFallback />}>
        {children}
      </Suspense>
    </SuspenseErrorBoundary>
  );
}

// Robust hash scroll handler
function useHashScroll() {
  useEffect(() => {
    const handleHashScroll = () => {
      const { hash } = window.location;
      if (hash) {
        // Delay slighty to allow lazy-loaded sections to potentially start mounting
        // and for the browser to finish rendering the initial frame
        // Refactored to 250ms per code review recommendation to minimize race conditions.
        setTimeout(() => {
          const element = document.querySelector(hash);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }, 250);
      }
    };

    // Run once on mount
    handleHashScroll();

    // Also listen for hash changes
    window.addEventListener("hashchange", handleHashScroll);
    return () => window.removeEventListener("hashchange", handleHashScroll);
  }, []);
}
const ShortcutHint = () => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    // Auto-hide the hint after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    // Hide immediately if they scroll down, but never reappear
    const handleScroll = () => {
      if (window.scrollY > 100) setIsVisible(false);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-8 right-8 z-40 hidden lg:flex items-center gap-3 px-4 py-2 bg-background/40 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl pointer-events-none transition-all duration-500"
        >
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Quick Actions</span>
             <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 rounded bg-foreground/10 border border-border font-mono text-xs font-bold text-foreground/80">⌘</kbd>
                <span className="text-xs font-bold text-muted-foreground">+</span>
                <kbd className="px-2 py-1 rounded bg-foreground/10 border border-border font-mono text-xs font-bold text-foreground/80">K</kbd>
             </div>
          </div>
          <div className="w-[1px] h-8 bg-border/50 mx-1" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">Command Palette</span>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};



export default function Home() {
  const { data: settings } = useSiteSettings();
  const { progress } = useScrollStore();
  useHashScroll();

  // section mapping to components
  const SECTION_MAP: Record<string, React.ReactNode> = useMemo(() => ({
    about: <SafeSection name="About"><About /></SafeSection>,
    skills: <SafeSection name="Skills"><Skills /></SafeSection>,
    whyhireme: <SafeSection name="Why Hire Me"><WhyHireMe /></SafeSection>,
    services: <SafeSection name="Services"><Services /></SafeSection>,
    mindset: <SafeSection name="Engineering Mindset"><EngineeringMindset /></SafeSection>,
    projects: <SafeSection name="Projects"><Projects /></SafeSection>,
    practice: <SafeSection name="Code and Practice"><CodeAndPractice /></SafeSection>,
    experience: <SafeSection name="Experience"><Experience /></SafeSection>,
    testimonials: <SafeSection name="Testimonials"><Testimonials /></SafeSection>,
    guestbook: <SafeSection name="Guestbook"><Guestbook /></SafeSection>,
    contact: <SafeSection name="Contact"><Contact /></SafeSection>,
    "live-activity": <SafeSection name="Live Activity"><LiveActivityTicker /></SafeSection>,
    "reading-list": <SafeSection name="Reading List"><ReadingList /></SafeSection>,
    "github-heatmap": <SafeSection name="Github Heatmap"><GithubHeatmap /></SafeSection>,
  }), []);

  // Build section order: admin-saved order takes priority, fall back to defaults
  // Always ensures any new sections from DEFAULT_SECTION_ORDER are included
    const sectionOrder = useMemo(() => {
        // 1. Start with admin order, otherwise defaults
        const adminOrder = settings?.sectionOrder as string[] | undefined;
        
        const baseOrder = adminOrder?.length ? [...adminOrder] : [...DEFAULT_SECTION_ORDER];

        // 2. Append any sections from defaults that aren't already in the base order
        DEFAULT_SECTION_ORDER.forEach((id: string) => {
          if (!baseOrder.includes(id)) {
            baseOrder.push(id);
          }
        });

        // 3. Always ensure new v8 features are present for the "wow" factor
        if (!baseOrder.includes('live-activity')) {
          // Insert live-activity after hero
          const heroIndex = baseOrder.indexOf('hero');
          if (heroIndex !== -1) {
            baseOrder.splice(heroIndex + 1, 0, 'live-activity');
          } else {
            baseOrder.unshift('live-activity');
          }
        }

        // 4. Always ensure hero is first
        const withoutHero = baseOrder.filter((id: string) => id !== "hero");
        return ["hero", ...withoutHero];
    }, [settings?.sectionOrder]);



  const sectionVisibility = (settings?.sectionVisibility as Record<string, boolean>) || {};

  return (
    <div className="min-h-screen selection:bg-primary/20">
      {/* Top Reading Progress Bar */}
      <div aria-hidden="true" className="fixed top-0 left-0 w-full h-1 z-[100] pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 origin-left will-change-transform transition-transform duration-75 ease-out"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>

      <SEO
        slug="home"
        title={settings?.personalName ? `${settings.personalName} - Portfolio` : "Your Name - Full-Stack Engineer Portfolio"}
        description={settings?.personalBio || "Portfolio of Your Name, a Full Stack Developer specializing in modern web technologies."}
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "Person",
            name: settings?.personalName || "Your Name",
            url: import.meta.env.VITE_SITE_URL || undefined,
            sameAs: [
              settings?.socialGithub,
              settings?.socialLinkedin,
              settings?.socialTwitter,
              settings?.socialInstagram,
              settings?.socialStackoverflow,
              settings?.socialDevto,
              settings?.socialMedium,
              settings?.socialYoutube,
              settings?.socialDiscord,
            ].filter(Boolean) as string[],
            jobTitle: settings?.personalTitle || "Full-Stack Engineer",
            worksFor: {
              "@type": "Organization",
              name: "Freelance",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: `${settings?.personalName || "Your Name"} Portfolio`,
            url: import.meta.env.VITE_SITE_URL || undefined,
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: import.meta.env.VITE_SITE_URL ? `${import.meta.env.VITE_SITE_URL}/blog?q={search_term_string}` : undefined
              },
              "query-input": "required name=search_term_string"
            }
          }
        ]}
      />

      <Navbar />

      <main id="main-content">
        <Hero />
        
        <ShortcutHint />

        {sectionOrder
          .filter((sectionId: string) => sectionVisibility[sectionId] ?? true)
          .map((sectionId: string, index: number) => {
          const component = SECTION_MAP[sectionId];

          if (!component) return null;

          return (
            <React.Fragment key={sectionId}>
              {index > 0 && <SectionDivider />}
              <SectionReveal>{component}</SectionReveal>
            </React.Fragment>
          );
        })}
      </main>

      <ErrorBoundary>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </ErrorBoundary>

      <Suspense fallback={null}>
        <BackToTop />
      </Suspense>
    </div >
  );
}
