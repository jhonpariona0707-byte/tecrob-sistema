/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        tecrob: {
          red:       '#E30613',
          redDark:   '#B00510',
          black:     '#111111',
          blackSoft: '#1E1E1E',
          white:     '#FFFFFF',
          grayLight: '#F5F5F5',
          grayMid:   '#CCCCCC',
          grayText:  '#666666',
        }
      },
      fontFamily: {
        title: ['Poppins', 'Montserrat', 'sans-serif'],
        body:  ['Roboto', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}