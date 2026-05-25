import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/android-chrome-192x192.png', 'icons/android-chrome-512x512.png'],
      manifest: {
        name: 'Flowledger',
        short_name: 'Flowledger',
        description: 'Control financiero multi-tenant para pequeñas empresas',
        theme_color: '#00ABA0',
        background_color: '#F5F5F5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icons/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Requests a Firestore (REST y streaming)
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutos
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Firebase Auth
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-auth-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Assets estáticos (JS, CSS, fuentes, imágenes)
            urlPattern: /\.(?:js|css|woff2?|ttf|png|jpg|jpeg|svg|ico|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
