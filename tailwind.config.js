/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0a0a0a',
          darkCard: '#121212',
          darkBorder: '#262626',
          light: '#f8fafc',
          lightCard: '#ffffff',
          lightBorder: '#e2e8f0',
          red: '#ef4444',
          redHover: '#dc2626',
          redDark: '#991b1b',
        }
      }
    },
  },
  plugins: [],
}