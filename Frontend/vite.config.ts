import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isPwaDisabled = env.VITE_DISABLE_PWA === 'true';

  const proxyTarget = process.env.VITE_API_PROXY_TARGET || process.env.VITE_API_URL?.replace(/\/v1\/?$/, '') || env.VITE_API_URL?.replace(/\/v1\/?$/, '') || 'http://127.0.0.1:5000';
  
  if (mode === 'development' || process.env.NODE_ENV === 'test') {
    console.warn(`[VITE CONFIG] Proxy Target: ${proxyTarget} (Mode: ${mode})`);
  }

  return {
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      disable: isPwaDisabled,
      registerType: 'prompt',
      workbox: {
        maximumFileSizeToCacheInBytes: 4000000,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
      },
    }),
  ],
  // esbuild: mode === 'production' ? {
  //   drop: ['console', 'debugger'],
  // } : {},
  resolve: {
    alias: {
      '#src': path.resolve(__dirname, './src'),
      '#shared': path.resolve(__dirname, '../packages/shared/src'),
      '@assets': path.resolve(__dirname, './assets'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/health': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/ping': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/health': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/ping': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 500,
    target: 'es2020',
    cssCodeSplit: true,
    // Use esbuild (Vite default) instead of Terser — Terser's variable
    // collapsing breaks Zod v3/v4 dual-bundle TDZ semantics.
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // Admin-only: rich text editor + all prosemirror/tiptap deps
          if (
            id.includes('/@tiptap/') ||
            id.includes('/prosemirror') ||
            id.includes('/lowlight/') ||
            id.includes('/highlight.js/') ||
            id.includes('/@lezer/') ||
            id.includes('/y-prosemirror/') ||
            id.includes('/orderedmap/')
          ) return 'vendor-editor';

          // Admin-only: 3D background
          if (id.includes('/three/')) return 'vendor-three';

          // Admin-only: charts + drag-and-drop + their transitive deps
          // Intentionally routed to vendor-misc (not a separate chunk) to avoid
          // Rollup placing the CJS interop helper here and creating a cross-dep
          // from vendor-core → vendor-admin that forces 400KB on every page.
          if (
            id.includes('/recharts/') ||
            id.includes('/d3-') ||
            id.includes('/internmap/') ||
            id.includes('/victory-vendor/') ||
            id.includes('/react-smooth/') ||
            id.includes('/decimal.js-light/')
          ) return 'vendor-charts';

          if (
            id.includes('/react-redux/') ||
            id.includes('/redux/') ||
            id.includes('/@redux') ||
            id.includes('/eventemitter3/') ||
            id.includes('/es-toolkit/') ||
            id.includes('/immer/') ||
            id.includes('/reselect/') ||
            id.includes('/@dnd-kit/')
          ) return 'vendor-misc';

          // Core framework — always needed
          // react-hook-form + @hookform MUST live here with React to avoid
          // Rollup cross-chunk TDZ errors (vendor-forms → vendor-core circular).
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/wouter/') ||
            id.includes('/@tanstack/react-query') ||
            id.includes('/@tanstack/query-core') ||
            id.includes('/react-is/') ||
            id.includes('/use-sync-external-store/') ||
            id.includes('/scheduler/') ||
            id.includes('/regexparam/') ||
            id.includes('/react-hook-form/') ||
            id.includes('/@hookform/')
          ) return 'vendor-core';

          // Motion — used on hero, keep separate
          if (
            id.includes('/framer-motion/') ||
            id.includes('/motion-dom/') ||
            id.includes('/motion-utils/')
          ) return 'vendor-animation';

          // UI primitives — shared across many components
          if (
            id.includes('/@radix-ui/') ||
            id.includes('/lucide-react/') ||
            id.includes('/clsx/') ||
            id.includes('/class-variance-authority/') ||
            id.includes('/tailwind-merge/')
          ) return 'vendor-ui';

          // Zod — pure JS, no React dependency, safe in its own chunk
          if (id.includes('/zod/')) return 'vendor-forms';

          // Let Rollup auto-split remaining node_modules — DO NOT use a
          // catch-all here. Forcing unrelated packages into one chunk
          // causes TDZ (Temporal Dead Zone) errors when esbuild reorders
          // minified variable declarations across modules.
          return;
        },
      },
    },
  },
};
});
