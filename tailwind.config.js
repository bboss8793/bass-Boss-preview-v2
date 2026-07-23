/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0900',
        card: '#111008',
        border: '#2a2000',
        gold: '#c8a030',
        'gold-bright': '#f0c84a',
        'text-primary': '#f0e8c8',
        'text-muted': '#a08040',
        'data-green': '#00cc66',
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
