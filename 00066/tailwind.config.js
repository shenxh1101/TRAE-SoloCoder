/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./api/**/*.{js,ts}"],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        acoustic: {
          deep: '#0A1929',
          navy: '#0D1B2A',
          midnight: '#1B2838',
          steel: '#2D3748',
          slate: '#4A5568',
          cyber: '#00D4FF',
          neon: '#00FFCC',
          danger: '#FF3366',
          warning: '#FF9800',
          success: '#00C853',
          data: '#7C3AED',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['IBM Plex Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        data: ['Roboto Mono', 'Courier New', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(0, 212, 255, 0.05) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(0, 212, 255, 0.05) 1px, transparent 1px)`,
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'scan-line': 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      boxShadow: {
        'glow-cyber': '0 0 20px rgba(0, 212, 255, 0.3)',
        'glow-danger': '0 0 20px rgba(255, 51, 102, 0.3)',
        'glow-success': '0 0 20px rgba(0, 200, 83, 0.3)',
        'glow-warning': '0 0 20px rgba(255, 152, 0, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        glowPulse: {
          '0%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(0, 212, 255, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
