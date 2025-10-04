/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6ee7b7',
          foreground: '#0f172a'
        },
        surface: {
          DEFAULT: '#0b1120',
          raised: '#111a2c',
          overlay: '#1d283a'
        }
      },
      boxShadow: {
        focus: '0 0 0 3px rgba(110,231,183,0.5)'
      }
    }
  },
  plugins: []
}
