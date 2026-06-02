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
        'deep-indigo': '#1a1b3d',
        'amber-gold': '#d4a84b',
        'crimson': '#8b2635',
        'forest': '#2d4a3e',
        'parchment': '#f5e6c8',
        'parchment-dark': '#e8d5a8',
        'ink': '#2c1810',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['"Crimson Pro"', 'serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'slide-in-right': 'slideInRight 0.5s ease-out forwards',
        'slide-out-left': 'slideOutLeft 0.5s ease-out forwards',
        'breathe': 'breathe 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(212, 168, 75, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(212, 168, 75, 0.8), 0 0 30px rgba(212, 168, 75, 0.4)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideOutLeft: {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(-30px)' },
        },
        breathe: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(212, 168, 75, 0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(212, 168, 75, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
