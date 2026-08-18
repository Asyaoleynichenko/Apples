import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so the build works on GitHub Pages project URLs
  // (username.github.io/repo/) as well as locally.
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    // Native FS events don't reach the watcher here, so edits never invalidate.
    watch: { usePolling: true, interval: 300 },
  },
});
