import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/Mokundo-Pos/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['mokundo.jpg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB limit for caching large logos
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Mokundo',
        short_name: 'Mokundo',
        description: 'Sistem Kasir (POS) Offline-First untuk UMKM',
        theme_color: '#0B204D',
        background_color: '#0B204D',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/Mokundo-Pos/',
        scope: '/Mokundo-Pos/',
        id: '/Mokundo-Pos/',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          {
            src: 'mokundo.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'maskable'
          },
          {
            src: 'mokundo.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'maskable'
          },
          {
            src: 'mokundo.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
