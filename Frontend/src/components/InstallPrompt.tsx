import { useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

/**
 * Deferred PWA install prompt — shown on 2nd visit, not first.
 * Listens for the `beforeinstallprompt` event, stores a visit counter
 * in localStorage, and shows a subtle banner after the 2nd visit.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const VISIT_KEY = 'pwa-visit-count';
const DISMISSED_KEY = 'pwa-install-dismissed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Don't show if user previously dismissed
    if (localStorage.getItem(DISMISSED_KEY) === 'true') return;

    // Track visit count
    const visits = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    // Only show on 2nd+ visit
    if (visits < 2) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    setDeferredPrompt(null);
    localStorage.setItem(DISMISSED_KEY, 'true');
  }, []);

  return (
    <AnimatePresence>
      {showBanner && (
        <m.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md shadow-lg p-4"
          role="dialog"
          aria-label="Install app"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Install App</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add to your home screen for a faster experience
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
              className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
