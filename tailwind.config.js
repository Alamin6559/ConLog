/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Mapped to CSS variables (see src/index.css) so the theme can switch at
        // runtime; the rgb(var() / <alpha-value>) form keeps Tailwind opacity
        // modifiers (e.g. bg-error/10) working.
        void: 'rgb(var(--c-void) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        panel: 'rgb(var(--c-panel) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        dim: 'rgb(var(--c-dim) / <alpha-value>)',
        subtle: 'rgb(var(--c-subtle) / <alpha-value>)',
        body: 'rgb(var(--c-body) / <alpha-value>)',
        bright: 'rgb(var(--c-bright) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-dim': 'rgb(var(--c-accent-dim) / <alpha-value>)',
        error: 'rgb(var(--c-error) / <alpha-value>)',
        'error-dim': 'rgb(var(--c-error-dim) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        'warn-dim': 'rgb(var(--c-warn-dim) / <alpha-value>)',
        ok: 'rgb(var(--c-ok) / <alpha-value>)',
        'ok-dim': 'rgb(var(--c-ok-dim) / <alpha-value>)',
        fault: 'rgb(var(--c-fault) / <alpha-value>)',
        debug: 'rgb(var(--c-debug) / <alpha-value>)',
        'chart-grid': 'rgb(var(--c-chart-grid) / <alpha-value>)',
        'chart-axis': 'rgb(var(--c-chart-axis) / <alpha-value>)',
        'chart-legend': 'rgb(var(--c-chart-legend) / <alpha-value>)',
        'chart-other': 'rgb(var(--c-chart-other) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
