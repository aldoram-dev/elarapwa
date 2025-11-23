import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  server: { port: 3030 },

  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@context': path.resolve(__dirname, './src/context'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@ui': path.resolve(__dirname, './src/ui'),
    },
  },

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*', 'screenshots/*', 'robots.txt', 'favicon.ico'],
      devOptions: {
        enabled: false, // Desactivar PWA en dev para evitar issues de caché/hmr
      },
      manifest: {
        name: 'Proyecto Elara PWA',
        short_name: 'Elara',
        description: 'Sistema de gestión empresarial Elara con React, TypeScript y Supabase.',
        start_url: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#16A34A',
        orientation: 'portrait-primary',
        icons: [
          { src: 'icons/logo-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          { src: 'screenshots/desktop.png', sizes: '1280x800', type: 'image/png', form_factor: 'wide', label: 'Login (Desktop)' },
          { src: 'screenshots/mobile.png', sizes: '720x1280', type: 'image/png', label: 'Login (Mobile)' },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit for precaching
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            // Cache de imágenes y fuentes
            urlPattern: ({ request }) =>
              ['image', 'font'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
              },
            },
          },
          {
            // Cache de llamadas a Supabase
            urlPattern: ({ url }) => url.origin.includes('supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
})
