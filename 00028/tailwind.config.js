/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'industrial': {
          'bg': '#0a0e17',
          'panel': 'rgba(42, 52, 68, 0.85)',
          'border': 'rgba(0, 212, 255, 0.2)',
          'accent': '#00d4ff',
          'danger': '#ff3366',
          'success': '#00ff88',
          'warning': '#ffaa00',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
        'display': ['Space Grotesk', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(255, 51, 102, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(255, 51, 102, 0.8)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
