import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, /api goes to the local FastAPI server (same idea as the Netlify proxy in production).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
