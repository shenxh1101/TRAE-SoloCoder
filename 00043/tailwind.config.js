/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        primary: {
          50: '#FFF5F0',
          100: '#FFE6D9',
          200: '#FFC9B0',
          300: '#FFA77A',
          400: '#FF8C4D',
          500: '#FF7A45',
          600: '#E6632D',
          700: '#C94D1A',
          800: '#A13D12',
          900: '#7A2E0D',
        },
        secondary: {
          50: '#F0FCFA',
          100: '#CCF5F0',
          200: '#99EBE1',
          300: '#66E0D2',
          400: '#4ECDC4',
          500: '#3DBDB5',
          600: '#2EA69E',
          700: '#23857F',
          800: '#1A6460',
          900: '#124340',
        },
        warning: {
          50: '#FFFDE6',
          100: '#FFF9B3',
          200: '#FFF480',
          300: '#FFEE4D',
          400: '#FFE66D',
          500: '#FFD93D',
          600: '#E6B82E',
          700: '#B38F23',
          800: '#80661A',
          900: '#4D3D10',
        },
        neutral: {
          50: '#F8F9FA',
          100: '#E9ECEF',
          200: '#DEE2E6',
          300: '#CED4DA',
          400: '#ADB5BD',
          500: '#6C757D',
          600: '#495057',
          700: '#343A40',
          800: '#2C3E50',
          900: '#1A252F',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-in-top': 'slideInTop 0.3s ease-out',
        'bounce-soft': 'bounceSoft 0.6s ease-out',
        'count-up': 'countUp 1s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInTop: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
