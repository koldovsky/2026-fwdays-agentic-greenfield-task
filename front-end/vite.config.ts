import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ds': fileURLToPath(new URL('../docs/orbit-tv-remote-design-system', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
})
