import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts so the Electron plugin doesn't load during tests.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
