import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    react(),
    // No "type": "module" in package.json, so the plugin builds the main and
    // preload processes as CommonJS (dist-electron/main.js, preload.js) — the
    // tested path that avoids Electron's ESM import-interop crash.
    electron([
      { entry: 'electron/main.ts' },
      {
        entry: 'electron/preload.ts',
        onstart(options) { options.reload() },
      },
    ]),
    renderer(),
  ],
})
