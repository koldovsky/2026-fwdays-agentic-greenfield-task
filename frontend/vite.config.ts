import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The dev server proxies backend routes so the frontend can call /health and /api
// without CORS during local development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/health': 'http://localhost:8000',
      '/api': 'http://localhost:8000',
    },
  },
})
