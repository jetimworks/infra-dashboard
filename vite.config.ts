import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  build: {
    // Generate relative paths for assets so it works on any domain/path
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1000,
  },
})
