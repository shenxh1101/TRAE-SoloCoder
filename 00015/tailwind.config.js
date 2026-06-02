/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        display: ['"ZCOOL QingKe HuangYou"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        night: '#0a0e27',
        gold: '#c9a96e',
        'gold-dark': '#8b6914',
      },
    },
  },
  plugins: [],
};
