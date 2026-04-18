/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#1E1B4B',
        surface: '#F7F9FB',
        'surface-container-low': '#F2F4F6',
        'surface-container-lowest': '#FFFFFF',
      }
    },
  },
  plugins: [],
}
