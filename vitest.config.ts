import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.tsx'],
    alias: {
      '@': path.resolve(__dirname, './')
    },
    include: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '!**/node_modules/**']
  }
})
