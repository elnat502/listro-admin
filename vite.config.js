import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  // 🔥 ADDED — PRODUCTION BUILD OPTIMIZATION (VERCEL SAFE)
  build: {
    chunkSizeWarningLimit: 2000, // allow larger bundles

    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
});