/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0900',
        card: '#181508',
        border: '#2a2200',
        gold: '#c8a030',
        'gold-bright': '#f0c84a',
        'text-primary': '#f0e8c8',
        'text-muted': '#8a7850',
        'data-green': '#00cc66',
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        body: ['Barlow', 'sans-serif'],
        condensed: ['Barlow Condensed', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
