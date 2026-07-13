/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070b14',
          900: '#0b1120',
          800: '#111a2e',
          700: '#1b2740',
        },
        mint: {
          400: '#34e0a1',
          500: '#10c98a',
          600: '#0aa874',
        },
        gold: {
          400: '#f5c451',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(52,224,161,.25), 0 8px 40px -8px rgba(16,201,138,.35)',
        card: '0 12px 40px -12px rgba(0,0,0,.6)',
      },
      backgroundImage: {
        'mint-grad': 'linear-gradient(135deg,#34e0a1 0%,#10c98a 100%)',
        'ink-grad': 'radial-gradient(1200px 400px at 50% -10%, rgba(52,224,161,.12), transparent 60%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .4s cubic-bezier(.2,.7,.2,1) both',
      },
    },
  },
  plugins: [],
};
