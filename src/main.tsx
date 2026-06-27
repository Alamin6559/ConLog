import React from 'react'
import ReactDOM from 'react-dom/client'
// Fonts are bundled rather than fetched from Google, so the app makes no
// network requests at all and works fully offline.
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/300.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import App from './App.tsx'
import './index.css'
import { ThemeProvider, applyTheme, resolveTheme, getStoredMode } from './theme'

// Apply the saved/system theme before first paint to avoid a flash.
applyTheme(resolveTheme(getStoredMode()))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
