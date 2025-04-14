
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Ensure we're building for mobile compatibility
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true, // Always generate sourcemaps for better debugging
    minify: mode === 'production', // Only minify in production
  }
}));
