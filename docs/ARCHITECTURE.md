# Architecture

Current architecture of `tenant-management`: request flow, tenant lifecycle, and cross-application boundaries.

## Stack overview

| Layer | Technology | Role |
|-------|------------|------|
| Backend | Laravel 12 (PHP 8.4) | Routing, auth, tenant/user/module business logic, Inertia responses |
| Queues | Laravel queue + jobs | Async tenant DB setup, migration retries, ensure-tenant-user (`ShouldQueue`) |
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

Heavy work runs **asynchronously on the queue** so HTTP requests return quickly. Each dispatch uses a **5 second delay** before the job runs (see `TenantManagementController`). You must run queue workers that listen to the named queues below (or use `queue:work` without `--queue` if you process all jobs).

### Background jobs

| Job | Queue (from controller dispatch) | Role |
|-----|----------------------------------|------|
| `TenantMigrationSetup` | `initial_tenant_migration_setup` | Runs full `TenantProvisioningService::provision()` after create. |
| `RetryTenantMigrationSetup` | `retry_tenant_migration_setup` | Runs `runTenantMigrations()` then updates setup fields to `ready` or `failed`. |
| `EnsureTenantUserJob` | `ensure_tenant_user` | Runs `ensureTenantUser()` in the target application. |

### 1) Create tenant

`TenantManagementController@store`:
- validates request (`TenantRequest`);
- creates tenant + domain records in landlord DB;
- initializes setup tracking (`setup_status=provisioning`, `setup_stage=database`);
- dispatches `TenantMigrationSetup` with tenant id (queued on `initial_tenant_migration_setup`, delayed 5 seconds).

The HTTP response returns **success immediately**; provisioning status moves to `ready` or `failed` only after the job runs.

`TenantMigrationSetup` calls `TenantProvisioningService::provision($tenant)`, which:
- `createDatabase`: creates tenant MySQL database using tenant credentials;
- `runTenantMigrations`: runs the target app tenant migrations through subprocess;
- `runTenantSeeders`: runs tenant seeders in tenant context;
- optionally normalizes stuck `provisioning` to `ready` if the service left the row in an intermediate state.

During provisioning, setup stage/status fields are updated per step. On success, tenant is marked `ready` with `setup_stage=complete` and `setup_completed_at`. On failure, tenant is marked `failed` with error details and failure timestamp.

If provisioning fails, the tenant record is retained (status-driven failure model). Inspect **Setup error log** in the UI or `setup_error` on the model; flash messages from create only cover validation / persistence failures, not async job outcomes.

### 2) Keep tenant schema updated

`TenantManagementController@runTenantMigrations`:
- marks tenant `provisioning` at `migration` stage and clears prior error timestamps;
- dispatches `RetryTenantMigrationSetup` (queue `retry_tenant_migration_setup`, delayed 5 seconds).

The job runs `TenantProvisioningService::runTenantMigrations($tenant)` then sets `ready` + `complete` on success, or `failed` + `migration` with error on exception.

### 3) Ensure tenant user exists

`TenantManagementController@createTenantUser` dispatches `EnsureTenantUserJob` (queue `ensure_tenant_user`, delayed 5 seconds). The job calls `TenantProvisioningService::ensureTenantUser($tenant)`, which shells into the target app via `tenants:artisan` and treats the last line of output (`seeded` or `skipped`) as success.

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
- **Queued actions**: success flashes for **Create tenant**, **Run migrations**, and **Create tenant user** confirm the request was accepted and the job was queued — refresh the list or watch setup status until the worker finishes (or check **Setup error log** on failure).
- Shared props from `HandleInertiaRequests` include app name, auth user, sidebar state, and flash payload.

Wayfinder-generated route/action helpers are the source of truth for frontend route calls.

---

## Security and operational boundaries

- Access control uses `auth`, `verified`, and permission middleware/trait on resource controllers.
- Disabled users are force-logged out by `EnsureUserIsEnabled`.
- Tenant DB credentials are stored encrypted at rest (Eloquent casts).
- Provisioning/migration/seed operations are side-effectful subprocess operations (run inside queued jobs) with logging.
- Provisioning state is observable and recoverable from UI actions instead of destructive rollback of failed tenant records.
- **Queue workers** must be running for create / run migrations / create tenant user to complete; otherwise jobs sit in `jobs` (or your queue backend) until processed.

---

## Setup state transitions

| Current state | Trigger/action | Next state | Notes |
|---------------|----------------|------------|-------|
| `provisioning` + `database` | `TenantMigrationSetup` job runs; DB created successfully | `provisioning` + `migration` | Transition inside `TenantProvisioningService::provision` (async after HTTP create). |
| `provisioning` + `migration` | Tenant migrations succeed | `provisioning` + `seeder` | Continues provisioning pipeline. |
| `provisioning` + `seeder` | Tenant seeders succeed | `ready` + `complete` | Sets `setup_completed_at`, clears error fields. |
| `provisioning` + any stage | Exception during provisioning | `failed` + failing stage | Stores `setup_error`, sets `setup_failed_at`. |
| `failed` + `migration` (or any) | User runs `Run migrations` (queues `RetryTenantMigrationSetup`) and job succeeds | `ready` + `complete` | HTTP returns immediately; worker runs migrations then updates status. |
| `failed` + `migration` (or any) | Same action but job throws | `failed` + `migration` | Error details/timestamp refreshed by job. |

Operational guidance:
- `ready`: tenant setup pipeline completed successfully.
- `provisioning`: setup currently in progress (or recently initiated).
- `failed`: setup requires operator intervention (typically run migrations, verify app path/config, then retry).

---

## Failure recovery guide

Step-by-step troubleshooting for stuck provisioning, failed stages, queue issues, and cross-app mismatches is documented in **[FAILURE-RECOVERY.md](FAILURE-RECOVERY.md)**.

---

## Test-covered behavior

Feature tests use `Bus::fake()` for HTTP flows and assert **jobs are dispatched** with the correct tenant id. Separate tests instantiate jobs and call `handle()` with a mocked `TenantProvisioningService` to assert **post-job** tenant state.

- **Create tenant**: tenant row stays `provisioning` / `database` until a worker runs `TenantMigrationSetup`; tests assert `TenantMigrationSetup` is dispatched and domains are stored.
- **Create tenant user**: asserts `EnsureTenantUserJob` is dispatched; job unit test asserts `ensureTenantUser` is invoked on the service.
- **Run migrations**: HTTP path asserts `RetryTenantMigrationSetup` is dispatched and tenant is marked `provisioning` / `migration` with errors cleared; job tests assert `ready` / `complete` on success and `failed` / `migration` on exception.

Local environment note: app is served via Herd at `https://tenant-management.test`.
