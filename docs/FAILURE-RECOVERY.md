# Failure recovery guide

Operator playbook when tenant setup stays stuck, shows **Failed**, or actions like **Run migrations** / **Create tenant user** do not complete as expected. For system design, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. Confirm the basics

| Check | What to do |
|-------|------------|
| Queue workers | Tenant provisioning and retries run as **queued jobs**. Ensure workers are running (e.g. `composer run dev`, or `php artisan queue:work`, or your process manager). Without workers, setup stays `provisioning` and jobs accumulate in the queue backend (e.g. `jobs` table when `QUEUE_CONNECTION=database`). |
| Queues listened to | Jobs use: `initial_tenant_migration_setup`, `tenant_migration_setup`, `retry_tenant_migration_setup`, `ensure_tenant_user`. Workers must process these queues (multi-queue worker or no `--queue` filter if all queues are processed). |
| Delay | Dispatches use a **5 second** delay before the job runs. Wait at least that long before assuming failure. |
| UI vs job outcome | A **success** flash after create / run migrations / create tenant user means **the job was queued**, not that provisioning finished. Refresh the tenants list and watch **Setup Status** and **Setup error log**. |

---

## 2. Read the failure signal

1. Open **Setup error log** from the tenant row menu (visible when `setup_error` is set).
2. Note **`setup_stage`** from the badge or database: `database`, `migration`, `seeder`, or `complete` (only when `setup_status` is `ready`).

Use the stage to pick the right section below.

---

## 3. Stuck on “Provisioning”

| Likely cause | Recovery |
|--------------|----------|
| No worker | Start queue workers; failed jobs may appear in `failed_jobs` after exceptions — use `php artisan queue:retry` if appropriate. |
| Job crashed before updating tenant | Check `storage/logs/laravel.log` for job classes (`TenantMigrationSetup`, `TenantSetupCreateDatabase`, `TenantSetupRunMigrations`, `TenantSetupRunSeeders`, `RetryTenantMigrationSetup`, `EnsureTenantUserJob`). |
| Database / MySQL unreachable | Fix connectivity from the app server to MySQL using the tenant’s `database_host`, `database_port`, and credentials. Retry after fixing. |

---

## 4. Failed at `database` stage

Typical issues: cannot create the tenant database (permissions, disk, connection).

| Step | Action |
|------|--------|
| 1 | Read **Setup error log** and Laravel log for the exact SQL / connection error. |
| 2 | Verify MySQL user can `CREATE DATABASE` (or pre-create DB and adjust flow if your policy differs). |
| 3 | Confirm `database_host`, `database_port`, `database_username`, `database_password` on the tenant record match your environment. |
| 4 | After fixing infrastructure, you may need to **delete the broken tenant row** and create a new tenant if the DB was partially created — or fix MySQL and use **Run migrations** only if the database already exists and the failure was transient. |

---

## 5. Failed at `migration` stage

Typical issues: target app base URL/config mismatch, internal auth mismatch, migration API errors, or tenant id missing in the target app’s landlord DB.

| Step | Action |
|------|--------|
| 1 | Ensure `config/tenant_applications.php` has a valid `api_base_urls[application_code]` (e.g. `VETMANAGEMENTSYSTEM_API_BASE_URL`). |
| 2 | Ensure `INTERNAL_SETUP_ISSUER` and `INTERNAL_SETUP_SHARED_SECRET` match on both apps; verify token endpoint `POST /api/internal/tenant-setup/token` is reachable. |
| 3 | Run **Run migrations** from the UI to queue `RetryTenantMigrationSetup` after fixing config/auth. |
| 4 | If the error mentions **unknown column** / **table**, the tenant schema is behind — **Run migrations** is the right retry after deploying new migrations to the target app. |
| 5 | If the error mentions **tenant not found** in the target app, ensure that application’s **landlord** `tenants` table contains a row with the **same UUID** as this tenant-management tenant. |

---

## 6. Failed at `seeder` stage

Seeding runs inside initial provisioning. Check Laravel logs for `Tenant seeding failed`.

| Step | Action |
|------|--------|
| 1 | Fix the target app’s seeders or tenant DB state (often same as migration/schema issues). |
| 2 | After fixing, you may need manual cleanup of the tenant DB or a **Run migrations** + re-seed strategy depending on what was partially applied — consult logs. |

---

## 7. “Create tenant user” failures

Runs in `EnsureTenantUserJob` (queue `ensure_tenant_user`).

| Symptom / message | Recovery |
|-------------------|----------|
| Stuck queued | Same as section 3 — workers and queue names. |
| Schema out of date | **Run migrations** first, then **Create tenant user** again. |
| Tenant not in target app’s landlord DB | Sync or create the tenant record in the managed application so internal setup endpoints can resolve tenant context. |
| API response missing `seeded` / `skipped` | Read API error from logs and fix the target app `ensure-user` endpoint/service behavior. |

---

## 8. Module sync issues

If landlord modules look correct but the tenant app does not see modules:

| Step | Action |
|------|--------|
| 1 | Confirm initial provisioning reached **ready** (tenant DB exists and has expected tables). |
| 2 | Re-save **Manage modules** for that tenant to re-run `TenantModuleSyncService` (landlord pivot + tenant DB `module` upsert). |
| 3 | Check logs for connection errors to the tenant database. |

---

## 9. Quick reference: UI actions

| Action | Effect |
|--------|--------|
| **Setup error log** | Read persisted `setup_error` (no side effects). |
| **Run migrations** | Queues `RetryTenantMigrationSetup`; on success sets `ready` / `complete`. |
| **Create tenant user** | Queues `EnsureTenantUserJob`. |
| **Edit tenant** | Updates landlord metadata and domains; does not re-run full provisioning automatically. |

---

## 10. Logs and database tables

- **Application log**: `storage/logs/laravel.log` (jobs and API client log failures with context).
- **Queue `database` driver**: inspect `jobs` and `failed_jobs` tables; retry failed jobs when the root cause is fixed.
- **Tenant row**: query `tenants` for `setup_status`, `setup_stage`, `setup_error`, `setup_failed_at`, `setup_completed_at`.

---

## Related docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — jobs, queues, internal setup API auth flow, cross-app paths.
- [CODEBASE.md](CODEBASE.md) — where jobs and services live.
- [DATA-MODELS.md](DATA-MODELS.md) — tenant fields and relationships.
