import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "generateSW",
      manifest: {
        name: "Invoice Creator",
        short_name: "Invoice",
        description: "Professional Invoice Generator",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "portrait",
        icons: [
          {
            src: "logo.jpeg",
            sizes: "192x192",
            type: "image/jpeg",
            purpose: "any",
          },
          {
            src: "logo.jpeg",
            sizes: "512x512",
            type: "image/jpeg",
            purpose: "any",
          },
          {
            src: "logo.jpeg",
            sizes: "192x192",
            type: "image/jpeg",
            purpose: "maskable",
          },
          {
            src: "logo.jpeg",
            sizes: "512x512",
            type: "image/jpeg",
            purpose: "maskable",
          },
        ],
      },


      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === "document" || request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            urlPattern: ({ request }) =>
              ["style", "script", "image", "font", "media"].includes(
                request.destination
              ),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

