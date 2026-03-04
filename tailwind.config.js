/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#f5f5f5',
          100: '#e0e0e0',
          200: '#949ba4',
          300: '#b5bac1',
          400: '#80848e',
          500: '#4e5058',
          600: '#313338',
          700: '#2b2d31',
          800: '#232428',
          900: '#1e1f22',
          950: '#111214',
        },
        brand: {
          DEFAULT: '#5865f2',
          hover: '#4752c4',
        },
        hearth: {
          amber: '#f59e0b',
          orange: '#f97316',
          warm: '#fbbf24',
        },
        iot: {
          online: '#22c55e',
          offline: '#6b7280',
          error: '#ef4444',
          updating: '#3b82f6',
        },
      },
    },
  },
  plugins: [],
};
