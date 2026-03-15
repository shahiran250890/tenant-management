# Authentication and permissions

How login, enabled users, roles, and permissions work, and how to protect routes and UI.

## Authentication (Laravel Fortify)

- **Login / logout**: Standard Laravel session auth. Fortify registers routes and controllers; config in `config/fortify.php` and `App\Providers\FortifyServiceProvider`.
- **Registration**: Can be disabled (e.g. only superadmin/admin add users via the Users UI). Controlled in Fortify config and provider.
- **Email verification**: Optional; middleware `verified` is used on some routes (e.g. dashboard, settings).
- **Password**: Forgot password and reset flows use Fortify; throttle and views are configurable.
- **Two-factor (2FA)**: Fortify + TwoFactorAuthenticatable on the User model. Enable/disable and recovery codes are managed in Settings; challenge page is used after login when 2FA is enabled.

The current user is always available in Inertia as `auth.user` (or null) and in PHP as `auth()->user()`.

---

## Enabled users

Users have an `is_enabled` flag. Disabled users must not use the app.

- **Middleware**: `App\Http\Middleware\EnsureUserIsEnabled` runs on every web request (registered in `bootstrap/app.php`).
- **Behaviour**: If the user is authenticated and `is_enabled` is false, the middleware:
  - Logs the user out
  - Invalidates the session and regenerates the CSRF token
  - Redirects to the login route with query `account_disabled=1`
- **Frontend**: The login page can read `account_disabled` and show a message (e.g. SweetAlert) that the account was disabled.

So: **all authenticated routes are effectively “enabled users only”**; no need to check `is_enabled` in controllers for normal pages.

---

## Roles and permissions (Spatie)

Authorization is done with [Spatie Laravel Permission](https://spatie.be/docs/laravel-permission): roles and permissions stored in the database, assigned to users.

### Permission names

Permissions are named by action + resource, e.g.:

- `view user`, `create user`, `update user`, `delete user`
- `view tenant`, `create tenant`, `update tenant`, `delete tenant`
- `view role`, `create role`, `update role`, `delete role`
- `view permission`, `create permission`, `update permission`, `delete permission`
- `view module`, `create module`, `update module`, `delete module`

Some controllers may also use a convenience check such as `add user` (e.g. for “Add user” button); that would be a separate permission or alias if defined. The seeded permissions are the four verbs above per resource.

### Middleware

- **Alias**: `permission` in `bootstrap/app.php` points to `App\Http\Middleware\EnsureUserHasPermission`.
- **Usage**: `$this->middleware('permission:view user')->only(['index', 'show'])` etc. Pass the permission name as the first argument.
- **Behaviour**: If the user does not have the given permission, they are redirected to the named route `access-denied` (Inertia page `errors/access-denied`).

Permission middleware is **not** applied in route files by default; it is applied in controllers (see below).

---

## Protecting controllers: HasResourcePermission

Resource controllers (users, tenants, roles, permissions, modules) use the `HasResourcePermission` concern.

1. **Trait**: `App\Concerns\HasResourcePermission`. The controller implements `resourcePermissionName()` (e.g. returns `'user'`) and calls `registerResourcePermissionMiddleware()` in the constructor.
2. **Registration**: `registerResourcePermissionMiddleware()` maps:
   - `index`, `show` → `permission:view {resource}`
   - `create`, `store` → `permission:create {resource}`
   - `edit`, `update` → `permission:update {resource}`
   - `destroy` → `permission:delete {resource}`
3. **Props for Inertia**: `resourcePermissionProps()` returns an array of booleans (e.g. `canViewUser`, `canCreateUser`, `canUpdateUser`, `canDeleteUser`) so the frontend can show/hide actions.
4. **Extra checks**: For non-resource actions (e.g. “add user” button), controllers may pass a custom prop like `canAddUser` via `auth()->user()->can('add user')` (if that permission exists) or use another permission.

**Adding a new resource with permissions:**

1. Create permissions (e.g. in a seeder): `view resource_name`, `create resource_name`, `update resource_name`, `delete resource_name`.
2. Assign them to roles as needed.
3. In the controller, use `HasResourcePermission` and implement `resourcePermissionName()` (e.g. `return 'resource_name';`). Call `registerResourcePermissionMiddleware()` in the constructor.
4. Pass `...$this->resourcePermissionProps()` (and any extra `can*` props) into the Inertia response so the UI can toggle buttons/links.

---

## Sensitive routes: confirm password and 2FA

- **Confirm password**: Some settings actions use the `confirm-two-factor-password` middleware (alias in `bootstrap/app.php`) to force re-entry of password (or 2FA) before proceeding. Used for sensitive operations (e.g. 2FA setup).
- **2FA challenge**: After login, if the user has 2FA enabled, Fortify redirects to the two-factor challenge page; the user must enter a code before reaching the app.

---

## Seeded roles and users

From `RolePermissionSeeder` (and related seeders):

- **superadmin**: Has all permissions (user, tenant, role, permission, module – create/update/delete/view). User “Super Admin” (`superadmin@example.com`) has this role.
- **admin**: Has a subset (e.g. create/view user; create/update/view tenant). User “System Admin” (`admin@example.com`) has this role.

Passwords in seed are typically `password` (for local dev only). Change or remove seed users in production.

---

## Summary

| Concern | Where it’s enforced |
|--------|----------------------|
| Must be logged in | Routes in `auth` / `auth:api` middleware groups |
| Must be verified (email) | Routes in `verified` middleware group |
| Must be enabled | `EnsureUserIsEnabled` on all web requests |
| Must have permission | Controllers using `HasResourcePermission` or explicit `permission:...` middleware |
| Confirm password / 2FA | Specific routes with `confirm-two-factor-password` and Fortify 2FA challenge |

Use `auth()->user()->can('permission name')` in controllers when you need an extra check; use the `can*` props in Inertia to drive UI visibility.
