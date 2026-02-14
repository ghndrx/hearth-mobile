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
        // Discord-like dark theme colors
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
      },
    },
  },
  plugins: [],
};
