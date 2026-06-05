/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        primary: {
          50: '#E8F0FF',
          100: '#C9D8FF',
          200: '#94B3FF',
          300: '#5E8CFF',
          400: '#2A69FF',
          500: '#165DFF',
          600: '#0E4BD6',
          700: '#093AA3',
          800: '#052970',
          900: '#02183D',
        },
        warning: {
          50: '#FFF3E8',
          100: '#FFE1C7',
          200: '#FFC18F',
          300: '#FFA257',
          400: '#FF8A1F',
          500: '#FF7D00',
          600: '#D66900',
          700: '#A35100',
          800: '#703800',
          900: '#3D1F00',
        },
        success: {
          50: '#E6FFED',
          100: '#BFF5CF',
          200: '#8AEBAA',
          300: '#55E085',
          400: '#2AD96A',
          500: '#00B42A',
          600: '#009C25',
          700: '#007F1F',
          800: '#006318',
          900: '#004611',
        },
        danger: {
          50: '#FFECE8',
          100: '#FFCFCC',
          200: '#FF9F99',
          300: '#FF6F66',
          400: '#F94F45',
          500: '#F53F3F',
          600: '#D92F2F',
          700: '#AD1F1F',
          800: '#7F1414',
          900: '#520A0A',
        },
        dark: {
          50: '#F7F8FA',
          100: '#E5E6EB',
          200: '#C9CDD4',
          300: '#86909C',
          400: '#4E5969',
          500: '#272E3B',
          600: '#1D2129',
          700: '#171A21',
          800: '#0F1115',
          900: '#08090C',
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'number-scroll': 'numberScroll 2s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(22, 93, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(22, 93, 255, 0.8)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        numberScroll: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': 'linear-gradient(rgba(22, 93, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(22, 93, 255, 0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '50px 50px',
      },
    },
  },
  plugins: [],
};
