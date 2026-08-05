import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1.5rem', screens: { '2xl': '1420px' } },
    extend: {
      colors: {
        bg: 'oklch(var(--bg) / <alpha-value>)',
        'bg-deep': 'oklch(var(--bg-deep) / <alpha-value>)',
        surface: {
          1: 'oklch(var(--surface-1) / <alpha-value>)',
          2: 'oklch(var(--surface-2) / <alpha-value>)',
          3: 'oklch(var(--surface-3) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'oklch(var(--line) / <alpha-value>)',
          soft: 'oklch(var(--line-soft) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'oklch(var(--text) / <alpha-value>)',
          2: 'oklch(var(--text-2) / <alpha-value>)',
          3: 'oklch(var(--text-3) / <alpha-value>)',
        },
        ember: {
          DEFAULT: 'oklch(var(--ember) / <alpha-value>)',
          hi: 'oklch(var(--ember-hi) / <alpha-value>)',
          dim: 'oklch(var(--ember-dim) / <alpha-value>)',
          ghost: 'oklch(var(--ember-ghost) / <alpha-value>)',
        },
        online: {
          DEFAULT: 'oklch(var(--online) / <alpha-value>)',
          dim: 'oklch(var(--online-dim) / <alpha-value>)',
        },
        warn: {
          DEFAULT: 'oklch(var(--warn) / <alpha-value>)',
          dim: 'oklch(var(--warn-dim) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'oklch(var(--danger) / <alpha-value>)',
          dim: 'oklch(var(--danger-dim) / <alpha-value>)',
        },
        info: 'oklch(var(--info) / <alpha-value>)',
        // shadcn-совместимые алиасы
        border: 'oklch(var(--line) / <alpha-value>)',
        input: 'oklch(var(--line-soft) / <alpha-value>)',
        ring: 'oklch(var(--ember-hi) / <alpha-value>)',
        background: 'oklch(var(--bg) / <alpha-value>)',
        foreground: 'oklch(var(--text) / <alpha-value>)',
        primary: {
          DEFAULT: 'oklch(var(--ember) / <alpha-value>)',
          foreground: 'oklch(0.14 0.02 32 / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'oklch(var(--surface-2) / <alpha-value>)',
          foreground: 'oklch(var(--text) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'oklch(var(--surface-2) / <alpha-value>)',
          foreground: 'oklch(var(--text-3) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'oklch(var(--surface-3) / <alpha-value>)',
          foreground: 'oklch(var(--text) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'oklch(var(--danger) / <alpha-value>)',
          foreground: 'oklch(0.96 0.01 25 / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'oklch(var(--surface-1) / <alpha-value>)',
          foreground: 'oklch(var(--text) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'oklch(var(--surface-1) / <alpha-value>)',
          foreground: 'oklch(var(--text) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Onest', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.4' }],
        sm: ['0.875rem', { lineHeight: '1.5' }],
        base: ['1rem', { lineHeight: '1.55' }],
        lg: ['1.25rem', { lineHeight: '1.35' }],
        xl: ['1.5rem', { lineHeight: '1.25' }],
        '2xl': ['2rem', { lineHeight: '1.15' }],
        '3xl': ['2.75rem', { lineHeight: '1.05' }],
      },
      borderRadius: {
        xs: '6px', sm: '9px', md: '13px', lg: '18px',
      },
      spacing: {
        1: '4px', 2: '8px', 3: '12px', 4: '16px',
        5: '24px', 6: '32px', 7: '48px', 8: '64px', 9: '96px',
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.25,1,0.5,1)',
        'out-expo': 'cubic-bezier(0.16,1,0.3,1)',
        'in-out-smooth': 'cubic-bezier(0.65,0,0.35,1)',
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 oklch(var(--online) / .55)' },
          '70%': { boxShadow: '0 0 0 9px oklch(var(--online) / 0)' },
          '100%': { boxShadow: '0 0 0 0 oklch(var(--online) / 0)' },
        },
        shimmer: { to: { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(0.16,1,0.3,1)',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.16,1,0.3,1) infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
