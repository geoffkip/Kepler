import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api/fitbit-v1.2': {
        target: 'https://api.fitbit.com/1.2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fitbit-v1\.2/, ''),
        secure: false,
      },
      '/api/fitbit': {
        target: 'https://api.fitbit.com/1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fitbit/, ''),
        secure: false,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Gravitic Kepler',
        short_name: 'Kepler',
        description: 'Advanced Health & Fitness Tracker',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
