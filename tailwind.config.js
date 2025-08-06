// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // 👇 この safelist ブロックを丸ごと追加
  safelist: [
    'bg-sticky-yellow',
    'bg-sticky-blue',
    'bg-sticky-green',
    'bg-sticky-pink',
    'bg-sticky-orange',
    'bg-sticky-purple',
  ],
  theme: {
    extend: {
      colors: {
        sticky: {
          yellow: '#fffba6',
          blue: '#a6d9ff',
          green: '#ccffb3',
          pink: '#ffc2e2',
          orange: '#ffd5a6',
          purple: '#d5b4ff',
        },
      }
    },
  },
  plugins: [],
}