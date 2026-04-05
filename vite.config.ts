import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/command': {
        target: process.env.VITE_COMMAND_SERVICE_URL || 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/command/, ''),
      },
      '/api/query': {
        target: process.env.VITE_QUERY_SERVICE_URL || 'http://localhost:8082',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/query/, ''),
      },
      '/api/workspace': {
        target: process.env.VITE_WORKSPACE_SERVICE_URL || 'http://localhost:8083',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/workspace/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    globals: true,
  },
})
