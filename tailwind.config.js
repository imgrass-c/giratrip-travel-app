/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F6F6F8',
        surface: {
          DEFAULT: '#FFFFFF',
          hover: '#FAFAFC',
          dark: '#F0F0F3',
          border: '#EBECEF',
        },
        ink: {
          DEFAULT: '#111111',
          muted: '#71717A',
          light: '#A1A1AA',
        },
        // Curated Primary Accent Color Palettes:
        // Default: Savannah Amber (#E07A5F / #D97706), with support for Pine Green, Cobalt Blue, Obsidian
        primary: {
          DEFAULT: 'var(--color-primary, #D97706)',
          dark: 'var(--color-primary-dark, #B45309)',
          light: 'var(--color-primary-light, #F59E0B)',
          subtle: 'var(--color-primary-subtle, rgba(217, 119, 6, 0.08))',
        },
        terracotta: {
          DEFAULT: '#E07A5F',
          light: '#F4A261',
        }
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'tactile-sm': '0 2px 8px -1px rgba(0, 0, 0, 0.04), 0 1px 3px -1px rgba(0, 0, 0, 0.02), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)',
        'tactile': '0 8px 24px -4px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)',
        'tactile-lg': '0 16px 36px -6px rgba(0, 0, 0, 0.07), 0 4px 12px -2px rgba(0, 0, 0, 0.03), inset 0 1px 0 0 rgba(255, 255, 255, 0.95)',
        'tactile-float': '0 20px 48px -8px rgba(0, 0, 0, 0.08), 0 6px 16px -3px rgba(0, 0, 0, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 1)',
        'tactile-inset': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
