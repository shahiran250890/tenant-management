# Architecture

High-level how the application works: request flow, backend vs frontend, and shared boundaries.

## Stack overview

| Layer | Technology | Role |
|-------|------------|------|
| Backend | Laravel 12 (PHP 8.4) | Routing, auth, business logic, Inertia responses |
| Frontend | React 19 + Inertia.js v2 | SPA UI; no separate API for page navigation |
| Auth | Laravel Fortify | Login, register (optional), 2FA, password reset |
| Authorization | Spatie Laravel Permission | Roles and permissions (e.g. `view user`, `create tenant`) |
| Routes (FE) | Laravel Wayfinder | TypeScript route/action functions generated from Laravel routes |
| Styling | Tailwind CSS v4 | Utility-first CSS |

The app is **not** a headless API: pages are server-rendered via Inertia (Laravel returns an Inertia response with a page component name and props; the client hydrates React).

---

## Request flow

1. **Browser** requests a URL (e.g. `/users`).
2. **Laravel** runs web middleware stack:
   - `HandleAppearance` — appearance cookie
   - `HandleInertiaRequests` — Inertia middleware (root view, shared props)
   - `AddLinkHeadersForPreloadedAssets` — Vite preload
   - `EnsureUserIsEnabled` — redirect disabled users to login
3. **Route** matches; optional `auth`, `verified`, or route-specific middleware (e.g. `permission:view user`) run.
4. **Controller** loads data, optionally authorizes, then returns:
   - `Inertia::render('page/name', [...props])` for pages, or
   - `redirect()`, `back()`, etc. for non-Inertia responses.
5. **Inertia** responds with a JSON payload: `{ component, props, url, version }`. The root Blade view (`app`) loads and boots the Vite app; the React app receives the payload and renders the matching page from `resources/js/pages/`.
6. **React** renders the page component with the given props. Navigation (links, form submissions) uses Inertia’s `router` or `<Link>` / `<Form>`, which trigger new requests and partial updates without full reloads when appropriate.

---

## Auth and tenant boundaries

- **Authentication**: Fortify handles login/logout, 2FA, password reset. Sessions are Laravel’s default (e.g. `session` driver from `.env`). The authenticated user is available as `auth.user` in shared Inertia props and in Blade/controllers via `auth()->user()`.
- **Enabled users**: The `EnsureUserIsEnabled` middleware runs on every web request. If the user is logged in but `is_enabled` is false, the session is terminated and the user is redirected to login with `account_disabled=1` so the login page can show a message.
- **Tenants**: The app manages **tenant records** (tenant management UI). It does not switch the current request’s “tenant context” (no global tenant scope). Tenant data is stored in the same database; tenant-specific features (e.g. per-tenant modules) are modelled via relationships (e.g. `Tenant` ↔ `Module` pivot) and exposed via controllers/pages as needed.

So: **auth** is global (one logged-in user); **tenant** is an entity you manage, not the request scope.

---

## Shared Inertia data

`HandleInertiaRequests::share()` pushes these into every Inertia page:

| Key | Description |
|-----|-------------|
| `name` | `config('app.name')` |
| `auth.user` | Current user or null |
| `sidebarOpen` | From cookie; used by sidebar layout |
| `flash` | `modal`, `success`, `error`, and related keys for flash messages and modal state |

Pages receive these as props automatically. Controllers add page-specific props via the second argument to `Inertia::render()`.

---

## Frontend entry and routing

- **Entry**: `resources/js/app.tsx` creates the Inertia app, resolves page components from `./pages/${name}.tsx`, and sets the document title. Theme is initialized from `use-appearance`.
- **Pages**: Live under `resources/js/pages/`. The `name` in `Inertia::render('folder/page')` maps to `pages/folder/page.tsx`.
- **Layouts**: Pages use layouts (e.g. `app-layout`, `auth-layout`, `settings/layout`) that wrap content with header/sidebar and pass shared props (e.g. `auth`, `breadcrumbs`).
- **Routes in TS**: Wayfinder generates route and controller actions under `@/routes` and `@/actions`. Use these for links and form submissions so URLs stay in sync with Laravel.

---

## Where things run

- **Server**: All route handling, auth, DB access, validation, and Inertia response building.
- **Client**: React rendering, Inertia navigation, client-side state (e.g. modals, toggles), and API calls when needed (e.g. `EnableStatusToggle` PATCH). CSRF is sent via cookie and header for non-Inertia requests.

For full stack dev: run Vite (`npm run dev`) and use Herd (or `php artisan serve`). The app is Herd-isolated and served at `https://tenant-management.test`.
