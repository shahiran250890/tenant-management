# Architecture

Current architecture of `tenant-management`: request flow, tenant lifecycle, and cross-application boundaries.

## Stack overview

| Layer | Technology | Role |
|-------|------------|------|
| Backend | Laravel 12 (PHP 8.4) | Routing, auth, tenant/user/module business logic, Inertia responses |
| Frontend | React 19 + Inertia.js v2 | SPA UX over server routes (no separate page-navigation API) |
| Auth | Laravel Fortify | Login, password reset, 2FA flow |
| Authorization | Permission middleware + resource permission trait | Resource-level permission checks (`tenant`, `user`) |
| Routes (FE) | Laravel Wayfinder | Type-safe route/action functions in TypeScript |
| Styling | Tailwind CSS v4 | Utility-first UI styling |

This app is an **Inertia monolith**: Laravel returns page component names + props, and React hydrates/render pages client-side.

---

## Runtime request flow

1. Browser requests a web route (for example `/tenants`).
2. Global web middleware runs:
   - `HandleAppearance`
   - `HandleInertiaRequests`
   - `AddLinkHeadersForPreloadedAssets`
   - `EnsureUserIsEnabled`
3. Route middleware runs (`auth`, `verified`, and resource permission checks).
4. Controller executes use case and returns either:
   - `Inertia::render(...)` for page loads, or
   - redirect / JSON for actions (toggle, save, run migration, etc.).
5. Inertia updates the current page without full reload where possible.

All tenant and user management routes are protected by `auth` + `verified`.

---

## Core domain model

- `Tenant` is the central entity (UUID primary key, non-incrementing).
- `Tenant` has many `Domain` records (hosts).
- `Tenant` belongs to one `Application` (`application_id`).
- `Tenant` belongs to many `Module` records through `module_tenant` with pivot `is_enabled`.
- Tenant database credentials (`database_username`, `database_password`) are encrypted casts on the model.
- Tenant setup lifecycle is tracked on the tenant record:
  - `setup_status` (`provisioning`, `ready`, `failed`)
  - `setup_stage` (`database`, `migration`, `seeder`, `complete`)
  - `setup_error`, `setup_failed_at`, `setup_completed_at`

Important boundary: this system stores **landlord metadata** about tenants and also orchestrates provisioning into application-specific tenant databases.

---

## Tenant lifecycle architecture

### 1) Create tenant

`TenantManagementController@store`:
- validates request (`TenantRequest`);
- creates tenant + domain records in landlord DB;
- initializes setup tracking (`setup_status=provisioning`, `setup_stage=database`);
- calls `TenantProvisioningService::provision($tenant)`.

`TenantProvisioningService::provision` performs:
- `createDatabase`: creates tenant MySQL database using tenant credentials;
- `runTenantMigrations`: runs the target app tenant migrations through subprocess;
- `runTenantSeeders`: runs tenant seeders in tenant context.

During provisioning, setup stage/status fields are updated per step. On success, tenant is marked `ready` with `setup_stage=complete` and `setup_completed_at`. On failure, tenant is marked `failed` with error details and failure timestamp.

If provisioning fails, the tenant record is retained (status-driven failure model) and the UI surfaces the error via flash message.

### 2) Keep tenant schema updated

`TenantManagementController@runTenantMigrations` is an on-demand remediation/sync action for existing tenants.

Flow:
- mark tenant as provisioning at migration stage;
- execute `TenantProvisioningService::runTenantMigrations($tenant)`;
- mark tenant `ready` on success or `failed` on exception.

### 3) Ensure tenant user exists

`TenantManagementController@createTenantUser` calls `TenantProvisioningService::ensureTenantUser($tenant)`, which executes the target app command via `tenants:artisan` and expects `seeded` or `skipped` output as the success signal.

---

## Cross-application execution model

This app does not directly run migration classes from other projects. Instead, it shells into target Laravel applications.

- Application paths are configured in `config/tenant_applications.php` (`applications` map keyed by application code).
- Current mapping includes `vetmanagementsystem`.
- Subprocess PHP binary is configurable via `PHP_CLI_PATH` (`tenant_applications.php` -> `php_binary`).
- Commands are run from the target app root using:
  - `php artisan tenants:artisan "migrate --path=database/migrations/tenant --database=tenant" --tenant={id}`
  - `php artisan tenants:artisan "db:seed --database=tenant" --tenant={id}`
  - `php artisan tenants:artisan ensure-tenant-user --tenant={id}`

This keeps tenant-management decoupled from implementation details inside each managed application.

---

## Module sync architecture

Tenant module updates are two-phase:

1. `TenantModuleController@update` syncs landlord pivot (`tenant->modules()->sync(...)`).
2. `TenantModuleSyncService::syncToTenantDatabase(...)` mirrors module state into tenant DB table `module` via dynamic DB connection + `upsert` on module `key`.

This ensures landlord configuration and tenant runtime module table stay aligned.

---

## Frontend and shared data

- Inertia pages live under `resources/js/pages`.
- Tenant management UI is served by `tenants/index` with:
  - `tenants` (with `domains`, `modules`, `application`)
  - active `modules`
  - active `applications`
  - permission props
  - modal query-state props (`openModal`, `openModalTenantId`).
- Tenants table now shows both:
  - operational status (`is_enabled`) via async toggle;
  - provisioning status (`setup_status` + `setup_stage`) via status badge (`Ready`, `Provisioning (...)`, `Failed (...)`).
- Tenant action menu includes operational commands:
  - `Setup error log` (shown when `setup_error` exists)
  - `Run migrations`
  - `Create tenant user`
  - `Manage modules`
- Setup failures are inspectable in a dedicated read-only modal (`Setup error log`) that displays persisted `setup_error` text for troubleshooting.
- Shared props from `HandleInertiaRequests` include app name, auth user, sidebar state, and flash payload.

Wayfinder-generated route/action helpers are the source of truth for frontend route calls.

---

## Security and operational boundaries

- Access control uses `auth`, `verified`, and permission middleware/trait on resource controllers.
- Disabled users are force-logged out by `EnsureUserIsEnabled`.
- Tenant DB credentials are stored encrypted at rest (Eloquent casts).
- Provisioning/migration/seed operations are side-effectful subprocess operations with logging and surfaced user-facing flash errors.
- Provisioning state is observable and recoverable from UI actions instead of destructive rollback of failed tenant records.

---

## Setup state transitions

| Current state | Trigger/action | Next state | Notes |
|---------------|----------------|------------|-------|
| `provisioning` + `database` | Database created successfully | `provisioning` + `migration` | Transition inside `TenantProvisioningService::provision`. |
| `provisioning` + `migration` | Tenant migrations succeed | `provisioning` + `seeder` | Continues provisioning pipeline. |
| `provisioning` + `seeder` | Tenant seeders succeed | `ready` + `complete` | Sets `setup_completed_at`, clears error fields. |
| `provisioning` + any stage | Exception during provisioning | `failed` + failing stage | Stores `setup_error`, sets `setup_failed_at`. |
| `failed` + `migration` (or any) | User runs `Run migrations` action and it succeeds | `ready` + `complete` | Recovery path from UI without deleting tenant record. |
| `failed` + `migration` (or any) | User runs `Run migrations` action and it fails | `failed` + `migration` | Error details/timestamp refreshed. |

Operational guidance:
- `ready`: tenant setup pipeline completed successfully.
- `provisioning`: setup currently in progress (or recently initiated).
- `failed`: setup requires operator intervention (typically run migrations, verify app path/config, then retry).

---

## Test-covered behavior

Current feature tests cover the key setup lifecycle guarantees:

- **Create tenant success**: provisioning service invocation leads to `setup_status=ready`, `setup_stage=complete`, and populated completion timestamp.
- **Create tenant failure**: tenant record is retained with `setup_status=failed`, stage/error captured, and domain records preserved.
- **Run migrations retry success**: failed tenant can transition back to `ready` + `complete`.
- **Run migrations retry failure**: tenant remains/returns `failed` with `setup_stage=migration` and refreshed error metadata.

Local environment note: app is served via Herd at `https://tenant-management.test`.
