# Codebase structure

Where to find things and where to add new features.

## Root layout

```
tenant-management/
├── app/                    # PHP application
├── bootstrap/              # Laravel bootstrap (app.php, providers)
├── config/                 # Laravel config
├── database/               # Migrations, seeders, factories
├── docs/                   # This documentation
├── public/                 # Entry point, assets (Vite build output)
├── resources/
│   ├── css/                # App CSS (Tailwind entry)
│   ├── js/                 # Frontend: pages, components, layouts, hooks, types
│   └── views/              # Blade (e.g. app.blade.php for Inertia root)
├── routes/                 # web.php, settings.php, console.php
├── storage/                # Logs, cache, uploads
└── tests/                  # Pest feature/unit tests
```

---

## Backend (`app/`)

| Path | Purpose |
|------|---------|
| `app/Http/Controllers/` | Controllers. Group by domain: `Users/`, `Tenant/`, `Settings/`. |
| `app/Http/Middleware/` | Custom middleware (e.g. `EnsureUserIsEnabled`, `EnsureUserHasPermission`). |
| `app/Http/Requests/` | Form Request classes; mirror controller grouping (e.g. `Users/UserRequest`). |
| `app/Models/` | Eloquent models. |
| `app/Services/` | Domain services (e.g. `TenantProvisioningService`, `TenantModuleSyncService`) for provisioning and cross-app sync orchestration. |
| `app/Concerns/` | Reusable traits (e.g. `HasResourcePermission`). |
| `app/Actions/` | Single-action or Fortify action classes (e.g. `Fortify/CreateNewUser`). |
| `app/Providers/` | Service providers (e.g. `FortifyServiceProvider`, `AppServiceProvider`). |

**Adding a new resource (e.g. “Projects”):**

- Create controller in `app/Http/Controllers/` (e.g. `Projects/ProjectController`).
- Add Form Request(s) in `app/Http/Requests/Projects/`.
- Register routes in `routes/web.php` or a dedicated route file included in `bootstrap/app.php`.
- If it uses permission checks, use `HasResourcePermission` and register permissions/roles (see [AUTH-AND-PERMISSIONS.md](AUTH-AND-PERMISSIONS.md)).

---

## Routes

| File | Purpose |
|------|---------|
| `routes/web.php` | Main web routes: home, dashboard, users, tenants, access-denied. Uses `auth` and `verified` middleware. |
| `routes/settings.php` | Profile, password, 2FA, appearance, system settings (roles, permissions, modules). Required from `web.php` or bootstrap. |
| `routes/console.php` | Artisan commands / scheduled tasks. |

Middleware is configured in `bootstrap/app.php` (no `app/Http/Kernel.php` in Laravel 12).

Tenant-specific action routes are defined under `tenants.*` in `routes/web.php`:
- `tenants.modules.update` (`PUT /tenants/{tenant}/modules`)
- `tenants.enabled.update` (`PATCH /tenants/{tenant}/enabled`)
- `tenants.create-tenant-user` (`POST /tenants/{tenant}/create-tenant-user`)
- `tenants.run-migrations` (`POST /tenants/{tenant}/run-migrations`)

---

## Frontend (`resources/js/`)

| Path | Purpose |
|------|---------|
| `pages/` | Inertia page components. Name must match `Inertia::render('path/to/page')`. |
| `layouts/` | Layout wrappers: `app-layout.tsx`, `auth-layout.tsx`, `app/`, `auth/`, `settings/`. |
| `components/` | Reusable UI. App-specific components (see [COMPONENTS.md](COMPONENTS.md)); `ui/` for primitives (Button, Dialog, etc.). |
| `hooks/` | Custom React hooks (e.g. `use-appearance`, `use-initials`, `use-mobile`). |
| `lib/` | Utilities (e.g. `utils`, `format-date-time`). |
| `types/` | TypeScript types (e.g. `User`, `BreadcrumbItem`, `NavItem`). |

**Adding a new page:**

1. Create `resources/js/pages/<section>/<name>.tsx` (or `pages/<name>.tsx`).
2. In a controller, return `Inertia::render('section/name', [...props])` (or `'name'` for root of `pages/`).
3. Use a layout (e.g. `AppLayout` with sidebar) and shared props (`auth`, `flash`) as needed.
4. Use Wayfinder-generated routes/actions for links and forms.

**Adding a new component:**

- App-specific: add under `resources/js/components/` and document in [COMPONENTS.md](COMPONENTS.md) if reusable.
- Primitive/design system: add under `resources/js/components/ui/`.

---

## Database

| Path | Purpose |
|------|---------|
| `database/migrations/` | Schema changes. Run with `php artisan migrate`. |
| `database/seeders/` | Seed data. `DatabaseSeeder` calls `RolePermissionSeeder`, `TenantManagementSeeder`, `ModuleSeeder`. |
| `database/factories/` | Model factories for tests and seeding. |

Tenant setup/provisioning tracking columns live in:
- `database/migrations/2026_03_31_000001_add_setup_status_to_tenants_table.php`
- `database/migrations/2026_03_31_000002_add_setup_tracking_columns_to_tenants_table.php`

---

## Config and environment

- **Environment**: `.env` (not committed). Copy from `.env.example`. Key config: `APP_*`, `DB_*`, `SESSION_*`, `VITE_APP_NAME`.
- **Config files**: `config/*.php`. Use `config('key')` in code; avoid `env()` outside config.

---

## Tests

- **Location**: `tests/`. Pest is used; feature tests typically live in `tests/Feature/`.
- **Run**: `php artisan test` or `php artisan test --compact --filter=TestName`. If the Artisan test command is not available (e.g. in some environments), use `./vendor/bin/pest` (e.g. `./vendor/bin/pest --compact` or `./vendor/bin/pest tests/Feature/Users/UserControllerTest.php`).
- **Convention**: Use factories for models; hit HTTP/Inertia when testing flows.
- **Tenant lifecycle coverage**:
  - `tests/Feature/Tenant/TenantProvisioningTest.php`
  - `tests/Feature/Tenant/TenantManagementControllerTest.php`

---

## Build and assets

- **Vite**: Entry in `resources/js/app.tsx`; config in `vite.config.*`. Run `npm run dev` or `npm run build`.
- **CSS**: `resources/css/app.css` (Tailwind); imported from `app.tsx`.
- **Wayfinder**: Generates TS from Laravel routes; output is consumed from `@/routes` and `@/actions`. Regenerate after route changes if your setup requires it (e.g. via `php artisan wayfinder:generate` or build step).
