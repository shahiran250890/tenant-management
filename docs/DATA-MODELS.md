# Data models

Main entities, relationships, and when to use which model.

## Users and auth

### User

- **Table**: `users`
- **Traits**: `HasFactory`, `HasRoles` (Spatie), `Notifiable`, `TwoFactorAuthenticatable` (Fortify)
- **Important attributes**: `name`, `email`, `password`, `is_enabled`, `email_verified_at`, `two_factor_confirmed_at`
- **Relations**: Roles and permissions via Spatie (e.g. `$user->roles`, `$user->can('view user')`)
- **Use for**: Current user, user management UI, permission checks. No direct relationship to Tenant in the default schema; users are global.

---

## Tenants and domains

### Tenant

- **Table**: `tenants`
- **Primary key**: UUID (string); `HasUuids`, `$incrementing = false`
- **Guarded**: `id`, `subscription_plan_id`; other attributes are fillable via mass assignment as needed
- **Casts**: `database_username` and `database_password` encrypted; `is_enabled` boolean
- **Appended**: `host` (accessor from first related domain)
- **Relations**:
  - `domains()` — HasMany `Domain`
  - `modules()` — BelongsToMany `Module` (pivot `module_tenant` with `is_enabled` and timestamps)
- **Use for**: Tenant management UI; represents a tenant record (name, DB credentials, enabled state, assigned modules). The app does not switch “current tenant” per request; tenants are managed as data.

### Domain

- **Table**: `domains`
- **Fillable**: `tenant_id`, `domain`
- **Relation**: `tenant()` — BelongsTo `Tenant`
- **Use for**: Storing tenant host/domain; the first domain is typically used for the Tenant’s `host` accessor.

### TenantDetail

- **Use for**: Extra tenant-related attributes if present; check the model and migrations for fields. Often used for extended tenant metadata.

---

## Modules

### Module

- **Table**: `modules`
- **Fillable**: `name`, `key`, `is_enabled`
- **Casts**: `is_enabled` boolean
- **Relation**: `tenants()` — BelongsToMany `Tenant` (pivot `module_tenant` with `is_enabled` and timestamps)
- **Use for**: System-wide module definitions; which modules exist and whether they’re enabled globally. Per-tenant module enablement is on the pivot (`module_tenant.is_enabled`).

---

## Subscription (optional)

### SubscriptionPlan

- **Use for**: If the app uses subscription plans, this model likely holds plan definitions. Tenants may reference `subscription_plan_id` (guarded on Tenant). Check migrations and usage for fields and relations.

---

## Spatie (roles and permissions)

Spatie uses its own tables:

- **roles**: Role records (e.g. `superadmin`, `admin`)
- **permissions**: Permission records (e.g. `view user`, `create tenant`)
- **model_has_roles**, **model_has_permissions**, **role_has_permissions**: Pivots

Use the Eloquent APIs: `User::role('admin')`, `$user->givePermissionTo('view user')`, `$user->can('view user')`, etc. Do not rely on raw table names in app code; use Spatie’s models and helpers.

---

## Relationship diagram (conceptual)

```
User (global)
  └── roles (Spatie) ──► Permission

Tenant (UUID)
  ├── domains (has many Domain)
  └── modules (belongs to many Module via module_tenant; pivot has is_enabled)

Module
  └── tenants (belongs to many Tenant via module_tenant)
```

---

## When to use which

| Need | Model / approach |
|------|-------------------|
| Current user, permissions | `auth()->user()`, `User` |
| List/edit users | `User`, with `roles` relation and Spatie checks |
| List/edit tenants | `Tenant`, with `domains` and `modules` |
| Tenant’s host name | `$tenant->host` (from first domain) or `$tenant->domains` |
| Assign modules to tenant | `Tenant::modules()` pivot; update via `TenantModuleController` or equivalent |
| System modules (CRUD) | `Module` |
| Check permission in PHP | `auth()->user()->can('permission name')` |
| Roles/permissions CRUD | Spatie’s `Role` and `Permission` models (e.g. in Settings) |

For any new entity, add a migration, model, and (if needed) factory/seeder; keep relationships and casts in the model and use Form Requests for validation in controllers.
