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
        pixel: ['"Press Start 2P"', 'monospace'],
        vt: ['"VT323"', 'monospace'],
      },
      colors: {
        pixel: {
          bg: '#1a1a2e',
          'bg-light': '#16213e',
          'bg-card': '#0f3460',
          purple: '#a855f7',
          green: '#22c55e',
          'retro-green': '#4ade80',
          'warm-brown': '#d97706',
          'cyber-purple': '#c084fc',
          border: '#2d2d5e',
        }
      },
      animation: {
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
        'pixel-scan': 'pixel-scan 0.6s ease-out forwards',
        'float-up': 'float-up 0.4s ease-out forwards',
        'bounce-in': 'bounce-in 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};
