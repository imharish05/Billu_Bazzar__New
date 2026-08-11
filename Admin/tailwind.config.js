/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:    '#FAFAF8',
          text:  '#1A1A1A',
          gold:  '#C9A24B',
          white: '#FFFFFF',
          grey:  '#6B6B6B',
          light: '#F0EEE8',
        },
      },
      fontFamily: {
        playfair: ['"Playfair Display"', 'Georgia', 'serif'],
        inter:    ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: { site: '1440px' },
    },
  },
  plugins: [],
}

