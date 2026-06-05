/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mine-dark': '#0A1628',
        'mine-blue': '#00D4FF',
        'mine-red': '#FF3B3B',
        'mine-green': '#00FF88',
        'mine-yellow': '#FFD700',
        'mine-gray': '#1A2740',
        'mine-light': '#2A3A5A',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1s ease-in-out infinite',
        'flow': 'flow 2s linear infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        flow: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
}
