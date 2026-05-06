import { Switch, Route, useRoute, useLocation } from "wouter";
import { QueryClientProvider, useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useState, Component, type ReactNode } from "react";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "#src/components/ui/toaster";
import { ThemeProvider } from "#src/components/theme-provider";
import { AuthProvider, ProtectedRoute } from "#src/hooks/auth-context";
import { ReloadPrompt } from "#src/components/ReloadPrompt";
import { InstallPrompt } from "#src/components/InstallPrompt";
import { LazyMotion, m, AnimatePresence } from "framer-motion";
const loadFramerFeatures = () => import("#src/lib/framer-features").then(res => res.default);
import { pageTransition, withReducedMotion } from "#src/lib/animation";
import { useTheme } from "#src/components/theme-provider";
import { CommandPalette } from "#src/components/CommandPalette";



// ─── Chunk-Load Error Boundary ────────────────────────────────────────────
// Catches React.lazy() failures (network blips, Render redeployment with
// new chunk hashes, cold-start races). Without this every chunk error
// bubbles to the global ErrorBoundary and shows "Critical System Error".
interface ChunkBoundaryState { hasError: boolean; retrying: boolean; }

class ChunkErrorBoundary extends Component<
  { children: ReactNode },
  ChunkBoundaryState
> {
  state: ChunkBoundaryState = { hasError: false, retrying: false };

  static getDerivedStateFromError(): ChunkBoundaryState {
    return { hasError: true, retrying: false };
  }

  componentDidCatch(error: Error) {
    const isChunkError =
      error.name === "ChunkLoadError" ||
      /loading chunk/i.test(error.message) ||
      /failed to fetch dynamically imported module/i.test(error.message) ||
      /importing a module script failed/i.test(error.message);

    if (isChunkError && !this.state.retrying) {
      const retryCount = parseInt(sessionStorage.getItem("chunk-retry-count") || "0", 10);
      if (retryCount < 3) {
        sessionStorage.setItem("chunk-retry-count", (retryCount + 1).toString());
        this.setState({ retrying: true });
        // Longer delay to allow for CDN propagation / Render cold start
        setTimeout(() => window.location.reload(), 2000);
      } else {
        // Stop retrying after 3 attempts to avoid infinite loops on real outages
        this.setState({ hasError: true, retrying: false });
        sessionStorage.removeItem("chunk-retry-count");
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="text-center space-y-4 max-w-sm">
            <p className="text-lg font-semibold text-foreground">
              {this.state.retrying ? "Reloading…" : "Failed to load page"}
            </p>
            <p className="text-sm text-muted-foreground">
              {this.state.retrying
                ? "A new version was detected. Refreshing automatically…"
                : "A network error occurred loading this page."}
            </p>
            {!this.state.retrying && (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy load heavy components
const PlexusBackground = lazy(() => import("#src/components/PlexusBackground").then(m => ({ default: m.PlexusBackground })));
const AnalyticsTracker = lazy(() => import("#src/components/AnalyticsTracker").then(m => ({ default: m.AnalyticsTracker })));
const Chatbot = lazy(() => import("#src/components/Chatbot").then(m => ({ default: m.Chatbot })));

// Eager-load Home for fast LCP — it no longer imports framer-motion directly
import Home from "#src/pages/Home";
const ProjectDetail = lazy(() => import("#src/pages/ProjectDetail"));
const ProjectsPage = lazy(() => import("#src/pages/Projects"));
const BlogList = lazy(() => import("#src/pages/BlogList"));
const BlogPost = lazy(() => import("#src/pages/BlogPost"));
const ClientPortalPage = lazy(() => import("#src/components/ClientPortal"));
const CaseStudyListPage = lazy(() => import("#src/components/CaseStudy").then(m => ({ default: m.CaseStudyList })));
const CaseStudyViewerPage = lazy(() => import("#src/components/CaseStudy").then(m => ({ default: m.CaseStudyViewer })));
const GuestbookPage = lazy(() => import("#src/pages/GuestbookPage"));
const ResumePage = lazy(() => import("#src/pages/Resume"));
const SearchPage = lazy(() => import("#src/pages/SearchPage"));
import NotFound from "#src/pages/not-found";

// Lazy load admin pages
const AdminLogin = lazy(() => import("#src/pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("#src/pages/admin/AdminDashboard"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

import { ErrorBoundary } from "./components/ErrorBoundary";
import { ServerStatusBanner } from "./components/ServerStatusBanner";
import { useSiteSettings } from "#src/hooks/use-site-settings";



// Only show PlexusBackground on public routes
function ConditionalBackground() {
  const [isAdmin] = useRoute("/admin/*?");
  const [isAdminLogin] = useRoute("/admin/login");
  if (isAdmin || isAdminLogin) return null;
  return <PlexusBackground />;
}

// Only show floating public controls on public routes
function ConditionalPublicFloaters() {
  const [isAdmin] = useRoute("/admin/*?");
  const [isAdminLogin] = useRoute("/admin/login");
  if (isAdmin || isAdminLogin) return null;

  return (
    <></>
  );
}

// Load analytics after a short delay to avoid blocking first paint
function DeferredAnalytics() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(t);
  }, []);
  return show ? (
    <Suspense fallback={null}>
      <AnalyticsTracker />
    </Suspense>
  ) : null;
}

function useScrollRestoration() {
  const [location] = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    const onScroll = () => {
      sessionStorage.setItem(`scrollPos:${location}`, window.scrollY.toString());
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location]);

  useEffect(() => {
    const savedPos = sessionStorage.getItem(`scrollPos:${location}`);
    if (savedPos !== null) {
      requestAnimationFrame(() => window.scrollTo({ top: parseInt(savedPos, 10), behavior: 'instant' }));
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location]);
}

// Router component
function Router() {
  const [location] = useLocation();
  useScrollRestoration();
  const { data: settings } = useSiteSettings();
  const { reducedMotion } = useTheme();
  const transition = withReducedMotion(pageTransition, reducedMotion);
  // Feature toggles from settings
  const showBlog = settings?.featureBlog ?? true;
  const showGuestbook = settings?.featureGuestbook ?? true;

  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <m.div
          key={location}
          initial={transition.initial}
          animate={transition.animate}
          exit={transition.exit}
          transition={transition.transition}
        >
          <Switch>
            {/* Public routes */}
            <Route path="/" component={Home} />
            <Route path="/projects" component={ProjectsPage} />
            <Route path="/project/:id" component={ProjectDetail} />
            <Route path="/search" component={SearchPage} />
            <Route path="/resume" component={ResumePage} />

            {/* Feature-guarded routes */}
            {showBlog && (
              <>
                <Route path="/blog" component={BlogList} />
                <Route path="/blog/:slug" component={BlogPost} />
              </>
            )}

            {showGuestbook && (
              <Route path="/guestbook" component={GuestbookPage} />
            )}

            {/* Client Portal */}
            <Route path="/portal" component={ClientPortalPage} />

            {/* Case Studies */}
            <Route path="/case-studies" component={CaseStudyListPage} />
            <Route path="/case-studies/:slug">
              {(params: { slug: string }) => <CaseStudyViewerPage slug={params.slug} />}
            </Route>

            {/* Admin routes */}
            <Route path="/admin/login" component={AdminLogin} />
            <Route path="/admin">
              {() => (
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              )}
            </Route>

            <Route component={NotFound} />
          </Switch>
        </m.div>
      </Suspense>
    </ChunkErrorBoundary>
  );
}

// Defer background loading to prioritize main content
function DeferredBackground() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Use requestIdleCallback to load 3D background after browser is idle
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(() => setShouldLoad(true));
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(() => setShouldLoad(true), 800);
      return () => clearTimeout(id);
    }
  }, []);

  if (!shouldLoad) return null;
  return (
    <Suspense fallback={null}>
      <ConditionalBackground />
    </Suspense>
  );
}

// Only show ChatBot on public routes — load on idle, not fixed timeout
function DeferredChatbot() {
  const [isAdmin] = useRoute("/admin/*?");
  const [isAdminLogin] = useRoute("/admin/login");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isAdmin || isAdminLogin) return;
    const id = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(id);
  }, [isAdmin, isAdminLogin]);

  if (isAdmin || isAdminLogin || !show) return null;

  return (
    <Suspense fallback={null}>
      <Chatbot />
    </Suspense>
  );
}

// framer-motion import moved to top of file

// Global loading indicator for query cache
function GlobalLoadingIndicator() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const { reducedMotion } = useTheme();
  const active = isFetching > 0 || isMutating > 0;

  return (
    <AnimatePresence>
      {active && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 pointer-events-none"
          style={{ zIndex: 'var(--z-max)' }}
        >
          <div className="h-1 w-full bg-primary/20 overflow-hidden relative">
            {reducedMotion ? (
              <div className="h-full w-full bg-primary/50" />
            ) : (
              <m.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="h-full w-1/3 bg-primary shadow-[0_0_10px_var(--primary-glow)]"
              />
            )}
            <div className="absolute top-2 right-4 text-[10px] font-medium tracking-wider text-primary/70 uppercase">
              Refreshing...
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}


import { TerminalOverlay } from "#src/components/TerminalOverlay";
import { DebugOverlay } from "#src/components/DebugOverlay";

// Main App component
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="portfolio-theme">
          <AuthProvider>
            <LazyMotion features={loadFramerFeatures}>
              <GlobalLoadingIndicator />

              <a
                href="#main-content"
                className="skip-to-content"
              >
                Skip to main content
              </a>
              <ServerStatusBanner />
              <DeferredAnalytics />
              <DeferredChatbot />
              <Router />
              <DeferredBackground />
              <ReloadPrompt />
              <InstallPrompt />
               <Toaster />
              <ConditionalPublicFloaters />
              <CommandPalette />
              <TerminalOverlay />
              <DebugOverlay />
            </LazyMotion>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
