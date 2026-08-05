# Phoenix Workforce Control — часть 1: структура и конфигурация

## Структура проекта

```
phoenix-workforce-control/
├── .env.example
├── .gitignore
├── .eslintrc.cjs
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vercel.json
├── components.json
├── README.md
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   └── 20260101000000_phoenix_init.sql
│   └── functions/
│       ├── _shared/cors.ts
│       ├── admin-create-operator/index.ts
│       ├── admin-delete-operator/index.ts
│       ├── admin-reset-password/index.ts
│       └── telegram-notify/index.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── vite-env.d.ts
    ├── lib/
    │   ├── supabase.ts
    │   ├── utils.ts
    │   ├── time.ts
    │   ├── errors.ts
    │   └── constants.ts
    ├── types/
    │   ├── database.ts
    │   └── domain.ts
    ├── schemas/
    │   ├── auth.schema.ts
    │   ├── employee.schema.ts
    │   ├── schedule.schema.ts
    │   └── settings.schema.ts
    ├── providers/
    │   ├── AuthProvider.tsx
    │   └── QueryProvider.tsx
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useShift.ts
    │   ├── useEmployees.ts
    │   ├── useLineStatus.ts
    │   ├── useSchedules.ts
    │   ├── useReports.ts
    │   └── useSettings.ts
    ├── components/
    │   ├── ui/           (shadcn: button, input, label, card, table, badge,
    │   │                  dialog, select, textarea, skeleton, sonner, tabs,
    │   │                  dropdown-menu, alert-dialog, switch, tooltip)
    │   ├── layout/       (AppShell, Sidebar, Topbar, PageHeader)
    │   ├── common/       (StatusTag, MetricStrip, DataState, ConfirmDialog,
    │   │                  Avatar, EmptyState, ErrorState, TableSkeleton)
    │   ├── operator/     (ShiftConsole, DailyScheduleForm, ShiftHistoryTable)
    │   └── admin/        (OperatorDialog, OperatorsTable, LineMonitorGrid,
    │                      ScheduleFeedTable, DayReport, MonthReport, TelegramCard)
    ├── routes/
    │   ├── AppRoutes.tsx
    │   ├── ProtectedRoute.tsx
    │   └── RoleGate.tsx
    └── pages/
        ├── LoginPage.tsx
        ├── NotFoundPage.tsx
        ├── BlockedPage.tsx
        ├── operator/
        │   ├── OperatorHomePage.tsx
        │   ├── OperatorSchedulePage.tsx
        │   └── OperatorHistoryPage.tsx
        └── admin/
            ├── DashboardPage.tsx
            ├── OperatorsPage.tsx
            ├── MonitorPage.tsx
            ├── SchedulesPage.tsx
            ├── ReportsPage.tsx
            └── SettingsPage.tsx
```

---

## `package.json`

```json
{
  "name": "phoenix-workforce-control",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "db:push": "supabase db push",
    "db:types": "supabase gen types typescript --linked > src/types/database.ts",
    "fn:deploy": "supabase functions deploy"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.1",
    "@radix-ui/react-alert-dialog": "^1.1.4",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-switch": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-tooltip": "^1.1.6",
    "@supabase/supabase-js": "^2.47.10",
    "@tanstack/react-query": "^5.62.11",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.469.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.54.2",
    "react-router-dom": "^6.28.1",
    "recharts": "^2.15.0",
    "sonner": "^1.7.1",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@typescript-eslint/eslint-plugin": "^8.19.1",
    "@typescript-eslint/parser": "^8.19.1",
    "@vitejs/plugin-react-swc": "^3.7.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.1",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.16",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vite": "^6.0.7"
  }
}
```

---

## `.env.example`

```bash
# ─── Supabase (публичные, попадают в бандл) ───────────────────
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key

# ─── Витрина ─────────────────────────────────────────────────
VITE_APP_NAME=Phoenix Workforce Control
VITE_DEFAULT_TIMEZONE=Europe/Moscow
VITE_LINE_POLL_MS=15000

# ══════════════════════════════════════════════════════════════
# СЕКРЕТЫ НИЖЕ НИКОГДА НЕ ПОПАДАЮТ ВО FRONTEND.
# Задаются командой:  supabase secrets set KEY=value
# ══════════════════════════════════════════════════════════════
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # только Edge Functions
# TELEGRAM_BOT_TOKEN=7284919233:AAF...      # только Edge Functions
# TELEGRAM_CHAT_ID=-1002214887301
```

---

## `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173, strictPort: false },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          charts: ['recharts'],
        },
      },
    },
  },
});
```

---

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "tailwind.config.ts"]
}
```

---

## `tailwind.config.ts`

```ts
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
```

---

## `postcss.config.js`

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

---

## `index.html`

```html
<!doctype html>
<html lang="ru" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="color-scheme" content="dark" />
    <meta name="theme-color" content="#221a1e" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Phoenix Workforce Control</title>
    <link rel="icon" type="image/svg+xml" href="/flame.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Onest:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --bg:          0.145 0.010 322;
    --bg-deep:     0.115 0.010 322;
    --surface-1:   0.185 0.012 322;
    --surface-2:   0.225 0.013 322;
    --surface-3:   0.275 0.014 322;
    --line:        0.315 0.013 322;
    --line-soft:   0.245 0.012 322;

    --text:        0.955 0.005 322;
    --text-2:      0.745 0.010 322;
    --text-3:      0.575 0.013 322;

    --ember:       0.665 0.185 32;
    --ember-hi:    0.735 0.170 40;
    --ember-dim:   0.325 0.085 32;
    --ember-ghost: 0.225 0.045 32;

    --online:      0.780 0.150 158;
    --online-dim:  0.300 0.058 158;
    --warn:        0.815 0.128 82;
    --warn-dim:    0.310 0.055 82;
    --danger:      0.640 0.170 25;
    --danger-dim:  0.300 0.100 25;
    --info:        0.730 0.090 262;

    --radius: 0.8125rem;
  }

  * { @apply border-line-soft; }

  html { -webkit-tap-highlight-color: transparent; }

  body {
    @apply bg-bg text-ink font-sans antialiased;
    font-weight: 350;
    letter-spacing: 0.011em;
    font-optical-sizing: auto;
  }

  h1, h2, h3, h4 {
    @apply font-semibold tracking-[-0.018em];
    text-wrap: balance;
  }

  p { text-wrap: pretty; }

  ::selection { @apply bg-ember-dim text-ink; }

  :focus-visible {
    @apply outline-none ring-2 ring-ember-hi ring-offset-2 ring-offset-bg rounded-xs;
  }

  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    @apply bg-surface-3 rounded-full;
    border: 3px solid oklch(var(--bg));
  }

  input[type='date'], input[type='time'] { color-scheme: dark; }
}

@layer components {
  .eyebrow {
    @apply text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-ink-3;
  }
  .num {
    @apply font-mono tabular-nums tracking-[-0.02em];
  }
  .panel {
    @apply rounded-lg border border-line-soft bg-surface-1 overflow-hidden;
  }
  .panel-head {
    @apply flex items-center gap-3 px-5 py-4 border-b border-line-soft;
  }
  .skeleton {
    @apply relative overflow-hidden rounded-xs bg-surface-2;
  }
  .skeleton::after {
    content: '';
    @apply absolute inset-0 animate-shimmer;
    background: linear-gradient(90deg, transparent, oklch(0.30 0.014 322 / 0.7), transparent);
    transform: translateX(-100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## `components.json` (shadcn CLI)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

Установка примитивов:

```bash
npx shadcn@latest add button input label card table badge dialog \
  alert-dialog select textarea skeleton tabs dropdown-menu switch tooltip sonner
```

---

## `vercel.json`

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "X-Robots-Tag", "value": "noindex, nofollow" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

---

## `.gitignore`

```gitignore
node_modules
dist
dist-ssr
*.local
.env
.env.*
!.env.example
.DS_Store
.vercel
supabase/.branches
supabase/.temp
*.log
```

---

## `.eslintrc.cjs`

```js
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { project: ['./tsconfig.json'], tsconfigRootDir: __dirname },
  plugins: ['react-refresh'],
  ignorePatterns: ['dist', 'supabase/functions', '.eslintrc.cjs'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

---

## `supabase/config.toml` (ключевое)

```toml
project_id = "phoenix-workforce-control"

[auth]
enabled = true
site_url = "http://localhost:5173"
additional_redirect_urls = ["https://phoenix-workforce.vercel.app"]
jwt_expiry = 3600
enable_refresh_token_rotation = true
refresh_token_reuse_interval = 10

# ── КРИТИЧНО: публичная регистрация выключена ──
enable_signup = false
enable_anonymous_sign_ins = false

[auth.email]
enable_signup = false
double_confirm_changes = true
enable_confirmations = false
secure_password_change = true

[auth.email.template]
# восстановление пароля отключено, пароль сбрасывает только админ

[db]
port = 54322
major_version = 15
```
