import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Get app version from package.json and git commit hash
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))
const appVersion = packageJson.version
let commitHash = 'unknown'
try {
  commitHash = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim()
} catch (e) {
  // Git not available or not in a git repo
}

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_COMMIT_HASH': JSON.stringify(commitHash),
  },
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
