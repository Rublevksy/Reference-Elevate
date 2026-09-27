import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        elevated: 'var(--bg-elevated)',
        line: 'var(--line)',
        blue: {
          DEFAULT: 'var(--blue)',
          bright: 'var(--blue-bright)',
          deep: 'var(--blue-deep)',
        },
        ink: 'var(--text)',
        muted: 'var(--text-muted)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 30px var(--blue-glow)',
        'glow-lg': '0 0 60px var(--blue-glow)',
        card: '0 24px 60px -20px rgba(0,0,0,0.8)',
      },
      borderRadius: {
        btn: '14px',
        card: '20px',
      },
      maxWidth: {
        shell: '1240px',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        drift: {
          '0%': { transform: 'translate3d(-10%,0,0) scaleX(1)' },
          '100%': { transform: 'translate3d(10%,0,0) scaleX(1.1)' },
        },
        spinSlow: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        caret: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        drift: 'drift 18s ease-in-out infinite alternate',
        'spin-slow': 'spinSlow 40s linear infinite',
        caret: 'caret 1s step-end infinite',
      },
    },
  },
  plugins: [],
};

export default config;
