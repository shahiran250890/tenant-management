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

Heavy work runs **asynchronously on the queue** so HTTP requests return quickly. The setup flow is staged and sequential via `Bus::chain()` and each stage updates tenant setup fields (`setup_status`, `setup_stage`, `setup_error`).

### Background jobs

| Job | Queue (from controller dispatch) | Role |
|-----|----------------------------------|------|
| `TenantMigrationSetup` | `initial_tenant_migration_setup` | Entry job; dispatches chain: `TenantSetupCreateDatabase` -> `TenantSetupRunMigrations` -> `TenantSetupRunSeeders`. |
| `TenantSetupCreateDatabase` | `tenant_migration_setup` | Calls internal setup API `POST /tenants/{id}/database`; marks `database` stage. |
| `TenantSetupRunMigrations` | `tenant_migration_setup` | Calls internal setup API `POST /tenants/{id}/migrations`; marks `migration` stage. |
| `TenantSetupRunSeeders` | `tenant_migration_setup` | Calls internal setup API `POST /tenants/{id}/seeders`; marks `seeder`, then `ready/complete`. |
| `RetryTenantMigrationSetup` | `retry_tenant_migration_setup` | Calls target-app internal API for migration retry and updates setup fields. |
| `EnsureTenantUserJob` | `ensure_tenant_user` | Calls target-app internal API to ensure tenant user (`seeded`/`skipped`). |

### 1) Create tenant

`TenantManagementController@store`:
- validates request (`TenantRequest`);
- creates tenant + domain records in landlord DB;
- initializes setup tracking (`setup_status=provisioning`, `setup_stage=database`);
- dispatches `TenantMigrationSetup` with tenant id (queue `initial_tenant_migration_setup`, delayed 5 seconds).

The HTTP response returns **success immediately**; provisioning status moves to `ready` or `failed` only after the job runs.

`TenantMigrationSetup` dispatches a chained sequence of jobs:
- `TenantSetupCreateDatabase`: marks `database` stage and calls target app internal API `POST /api/internal/tenant-setup/tenants/{id}/database`;
- `TenantSetupRunMigrations`: marks `migration` stage and calls target app internal API `POST /api/internal/tenant-setup/tenants/{id}/migrations`;
- `TenantSetupRunSeeders`: marks `seeder` stage and calls target app internal API `POST /api/internal/tenant-setup/tenants/{id}/seeders`, then marks `ready` + `complete`.

During provisioning, setup stage/status fields are updated per step. On success, tenant is marked `ready` with `setup_stage=complete` and `setup_completed_at`. On failure, tenant is marked `failed` with error details and failure timestamp.

If provisioning fails, the tenant record is retained (status-driven failure model). Inspect **Setup error log** in the UI or `setup_error` on the model; flash messages from create only cover validation / persistence failures, not async job outcomes.

### 2) Keep tenant schema updated

`TenantManagementController@runTenantMigrations`:
- marks tenant `provisioning` at `migration` stage and clears prior error timestamps;
- dispatches `RetryTenantMigrationSetup` (queue `retry_tenant_migration_setup`, delayed 5 seconds).

The job calls target-app internal API endpoint `POST /api/internal/tenant-setup/tenants/{id}/migrations` then sets `ready` + `complete` on success, or `failed` + `migration` with error on exception.

### 3) Ensure tenant user exists

`TenantManagementController@createTenantUser` dispatches `EnsureTenantUserJob` (queue `ensure_tenant_user`, delayed 5 seconds). The job calls target-app internal API endpoint `POST /api/internal/tenant-setup/tenants/{id}/ensure-user` and treats API `result` (`seeded` or `skipped`) as success.

---

## Cross-application execution model

This app does not directly run migration classes from other projects. Instead, it calls authenticated internal setup APIs exposed by each managed application.

- Application API base URLs are configured in `config/tenant_applications.php` (`api_base_urls` map keyed by application code).
- Base URL resolution is dynamic per tenant, in this priority order:
  1. `tenant.setup_api_base_url` (explicit override per tenant)
  2. first tenant domain (`tenant.domains[0].domain`)
  3. application fallback in `tenant_applications.api_base_urls[application_code]`
- If a host is stored without scheme, URL normalization uses:
  1. `tenant_applications.internal_api.default_scheme` (`INTERNAL_SETUP_DEFAULT_SCHEME`)
  2. scheme from `APP_URL`
  3. fallback `https`
- Internal auth is configured with shared secret + issuer (`tenant_applications.internal_api.*`).
- Token flow:
  - Tenant-management signs `X-Internal-Setup-Issuer`, `X-Internal-Setup-Timestamp`, `X-Internal-Setup-Signature` and calls `POST /api/internal/tenant-setup/token`.
  - Managed app returns a short-lived bearer token, cached by token hash.
  - Stage endpoints use `Authorization: Bearer <token>`.
- Resilience behavior for multi-tenant/local environments:
  - if token endpoint returns `404` on a candidate base URL, client falls back to next candidate;
  - if `https://` candidate cannot connect, client also tries `http://` variant for the same host.
- Token request failures now include token URL, HTTP status, and server message for faster diagnosis.
- Current API endpoints used:
  - `POST /api/internal/tenant-setup/token`
  - `POST /api/internal/tenant-setup/tenants/{id}/database`
  - `POST /api/internal/tenant-setup/tenants/{id}/migrations`
  - `POST /api/internal/tenant-setup/tenants/{id}/seeders`
  - `POST /api/internal/tenant-setup/tenants/{id}/ensure-user`

This keeps tenant-management decoupled from implementation details and filesystem/PHP-binary concerns inside each managed application.

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
- Provisioning/migration/seed operations are side-effectful internal API operations (run inside queued jobs) with logging.
- Provisioning state is observable and recoverable from UI actions instead of destructive rollback of failed tenant records.
- **Queue workers** must be running for create / run migrations / create tenant user to complete; otherwise jobs sit in `jobs` (or your queue backend) until processed.

---

## Setup state transitions

| Current state | Trigger/action | Next state | Notes |
|---------------|----------------|------------|-------|
| `provisioning` + `database` | `TenantMigrationSetup` dispatches chain; `TenantSetupCreateDatabase` succeeds | `provisioning` + `migration` | Async chain on `tenant_migration_setup` queue. |
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

- **Create tenant**: tenant row stays `provisioning` / `database` until a worker runs `TenantMigrationSetup`; tests assert dispatch and domain persistence.
- **Create tenant user**: asserts `EnsureTenantUserJob` dispatch; job test asserts `TenantSetupApiClient::ensureTenantUser` is invoked.
- **Run migrations**: HTTP path asserts `RetryTenantMigrationSetup` dispatch and tenant marked `provisioning` / `migration`; job tests assert `ready` / `complete` on success and `failed` / `migration` on exception.

Local environment note: app is served via Herd at `https://tenant-management.test`.
