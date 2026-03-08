import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "../backend/frontend/dist",
    sourcemap: false,
    minify: "esbuild",
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 662,
    strictPort: true,
    allowedHosts: [
      ".thehanifz.fun",
    ],
    // Proxy ini hanya aktif saat mode Development (npm run dev)
    // Tujuannya membelokkan request /api ke backend localhost
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:661',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});