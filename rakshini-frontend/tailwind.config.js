/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#050b14',
          panel: 'rgba(10, 15, 30, 0.6)',
          border: 'rgba(6, 182, 212, 0.3)',
          cyan: '#06b6d4',
          neonBlue: '#00f3ff',
          neonRed: '#ff003c',
          textMain: '#e2e8f0',
          textMuted: '#64748b'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", 'monospace'],
      },
      boxShadow: {
        'cyan-glow': '0 0 10px rgba(6, 182, 212, 0.5), inset 0 0 5px rgba(6, 182, 212, 0.2)',
        'red-glow': '0 0 10px rgba(255, 0, 60, 0.5), inset 0 0 5px rgba(255, 0, 60, 0.2)',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 4s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
