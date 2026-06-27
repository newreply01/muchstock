import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 31000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3005',
        changeOrigin: true
      }
    }
  }
})
