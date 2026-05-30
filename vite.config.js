// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

/**
 * Vite plugin: replaces WORKER_URL_PLACEHOLDER in dist/_headers
 * with the actual VITE_WORKER_URL env var after the build is written.
 */
function headersWorkerUrlPlugin() {
  return {
    name: 'headers-worker-url',
    closeBundle() {
      const headersPath = resolve(__dirname, 'dist/_headers');
      try {
        let content = readFileSync(headersPath, 'utf8');
        const workerUrl = process.env.VITE_WORKER_URL ?? '';
        content = content.replace(/WORKER_URL_PLACEHOLDER/g, workerUrl);
        writeFileSync(headersPath, content, 'utf8');
        console.log('[headers-plugin] replaced WORKER_URL_PLACEHOLDER →', workerUrl || '(empty)');
      } catch {
        // _headers may not exist in dev — safe to ignore
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load .env so VITE_WORKER_URL is accessible at build time
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // ── Dev server ──────────────────────────────────────────────────────────
    server: {
      port: 5173,
      strictPort: true,
    },

    // ── Build ───────────────────────────────────────────────────────────────
    build: {
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Firebase into its own chunk (largest dep ~200KB)
            if (id.includes('node_modules/firebase')) {
              return 'firebase';
            }
            // DOMPurify into its own chunk (used across all pages)
            if (id.includes('node_modules/dompurify')) {
              return 'purify';
            }
            // qrcode + jsqr are dynamic imports — Rollup auto-splits them
          },
          // Deterministic asset naming for long-term caching
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
        },
      },
    },

    // ── Plugins ─────────────────────────────────────────────────────────────
    plugins: [
      headersWorkerUrlPlugin(),
      // Bundle visualizer — only generates in analyze mode
      mode === 'analyze' &&
        visualizer({
          filename: 'dist/stats.html',
          open: true,
          gzipSize: true,
        }),
    ].filter(Boolean),

    // ── Env ─────────────────────────────────────────────────────────────────
    define: {
      // Make VITE_WORKER_URL available as import.meta.env.VITE_WORKER_URL
      '__VITE_WORKER_URL__': JSON.stringify(env.VITE_WORKER_URL ?? ''),
      // App version from package.json
      '__APP_VERSION__': JSON.stringify(
        JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')).version ?? '1.0.0'
      ),
    },
  };
});
