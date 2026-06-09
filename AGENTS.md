# PatoLab — AGENTS.md

## Stack
- **Backend**: Laravel 13 (PHP 8.3+) + Fortify auth + Pest tests
- **Frontend**: React 19, Inertia.js v3 SPA, TypeScript, Tailwind CSS 4, Vite 8
- **UI**: shadcn/ui (New York), Radix UI, Lucide icons, Headless UI
- **Database**: SQLite (dev/testing), MySQL/PostgreSQL (production)
- **Collaborative editor**: Hocuspocus v4 server (`editor-collaboration-server/`), Yjs + TipTap
- **PDF**: Spatie Browsershot (requires Chromium, set `PUPPETEER_EXECUTABLE_PATH`)

## Commands

| Action | Command |
|---|---|
| Full CI check | `composer ci:check` |
| Run tests | `composer test` (runs Pint + Pest) |
| Run Pest only | `./vendor/bin/pest` |
| PHP lint (Pint) | `composer lint` — fixes; `composer lint:check` — dry-run |
| Frontend format | `npm run format` — Prettier; `npm run format:check` |
| Frontend lint | `npm run lint` — ESLint fix; `npm run lint:check` |
| TypeScript check | `npm run types:check` |
| Dev server | `composer dev` — runs `artisan serve`, `queue:listen`, `pail`, Vite concurrently |
| Frontend dev | `npm run dev` (standalone Vite) |
| Build | `npm run build` (Vite); `npm run build:ssr` (adds SSR) |
| Full setup | `composer setup` |

## Setup
After `composer install && npm i`:
```sh
php artisan key:generate
php artisan storage:link
php artisan wayfinder:generate --with-form   # required after route changes
php artisan migrate:fresh --seed
```
Wayfinder generates `resources/js/{actions,routes,wayfinder}/` — gitignored, re-run after changing routes.

## Architecture
- **Page routing**: Laravel routes return Inertia responses → page components in `resources/js/pages/`
- **Layout routing** (`resources/js/app.tsx`): public/welcome pages get no layout, `auth/*` → AuthLayout, `settings/*` → AppLayout+SettingsLayout, else AppLayout
- **Collaboration**: `editor-collaboration-server/` is a standalone WS server (port 1234). Has its own `package.json` — run `npm install && npm run dev` inside that directory. Communicates with Laravel via `/api/collaboration` webhook.
- **Auth**: Laravel Fortify with custom Actions in `app/Actions/Fortify/`, two-factor supported
- **Queue**: DB-backed (`QUEUE_CONNECTION=database`). Run `php artisan queue:listen`.
- **SSR**: Inertia SSR enabled on `http://127.0.0.1:13714`

## Testing
- Pest PHP with `phpunit.xml` using SQLite `:memory:` — no external DB needed
- Suites: `tests/Unit/`, `tests/Feature/`
- CI runs `./vendor/bin/pest` on PHP 8.3/8.4/8.5

## Code style
- **PHP**: Laravel Pint (default preset)
- **JS/TS**: ESLint (import order enforced, `consistent-type-imports` with separate type imports preferred at top level) + Prettier (4-space indent, single quotes, semicolons, `prettier-plugin-tailwindcss`)
- shadcn/ui components in `resources/js/components/ui/` are ESLint-ignored

## Domain model (core)
`Specimen` (central entity) → belongs to Customer, Priority, SpecimenType/Examination, Sequence; has SpecimenReport, Invoice. Kanban board uses `priorities_specimens_order` table — after DB restore, clean stale rows (see README).

## Production deploy
```sh
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan config:cache && route:cache && view:cache
```
Ensure Chromium installed for PDF, queue worker running, cron for scheduler.

## Gotchas
- `.npmrc` sets `ignore-scripts=true` — lifecycle scripts won't run
- CI workflow runs `npm i` (not `npm ci`) for Node deps
- Always run `php artisan wayfinder:generate --with-form` after route changes
- `bootstrap/ssr`, `public/build`, `resources/js/{actions,routes,wayfinder}` are gitignored build artifacts
- Default DB is SQLite (file-based in `database/database.sqlite`)
