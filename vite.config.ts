import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "vue-i18n": "vue-i18n/dist/vue-i18n.cjs.js",
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      'vue-easy-lightbox$': 'vue-easy-lightbox/dist/external-css/vue-easy-lightbox.esm.min.js',
    },
  },
  base: "/",
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      external: ['mqtt']
    }
  },
  optimizeDeps: {
    include: ['jspdf', 'jspdf-autotable', 'html2canvas'],
    exclude: ['mqtt']
  },
  server: {
    // Fix 404 error on refresh for SPA routing
    historyApiFallback: true,
    port: 3000,
    host: true
  },
  preview: {
    // Fix 404 error on refresh in preview mode
    port: 3000,
    host: true
  }
});
