# Conventions

Naming, patterns, and style so the codebase stays consistent and Cursor/developers know what to follow.

## PHP (Laravel)

- **Style**: Laravel Pint. Run `vendor/bin/pint --dirty --format agent` (or `composer run lint`) after changing PHP files.
- **Control structures**: Always use curly braces, including single-line bodies.
- **Types**: Use explicit return types and parameter type hints on methods.
- **Constructors**: Prefer PHP 8 constructor property promotion. No empty `__construct()` with zero parameters unless private.
- **Comments**: Prefer PHPDoc over inline comments. No comments inside code unless logic is non-obvious.
- **Enums**: Use TitleCase for enum keys (e.g. `FavoritePerson`, `Monthly`).

### Controllers

- **Location**: `app/Http/Controllers/`. Group by domain: `Users/UserController`, `Tenant/TenantManagementController`, `Settings/ProfileController`.
- **Form validation**: Use Form Request classes in `app/Http/Requests/`, not inline `$request->validate()` in controllers. Mirror controller grouping (e.g. `Users/UserRequest`, `Tenant/TenantRequest`).
- **Inertia**: Return `Inertia::render('page/name', array_merge(..., $this->resourcePermissionProps()))` for pages. Pass only the props the page needs; shared props (auth, flash) come from middleware.

### Authorization

- **Resource controllers**: Use `HasResourcePermission`; implement `resourcePermissionName()` and call `registerResourcePermissionMiddleware()` in the constructor. Pass `...$this->resourcePermissionProps()` into Inertia so the UI can show/hide actions.
- **Config**: Use `config('key')` in code; use `env()` only inside config files.

### Database and models

- Prefer Eloquent and relationships over raw queries. Use `Model::query()` and eager loading to avoid N+1.
- New models: create with `php artisan make:model` (and `--factory`, `--migration`, `--seeder` as needed). Add factories and seeders for tests and dev data.

---

## Frontend (React / TypeScript)

- **Style**: ESLint and Prettier. Run `npm run lint`, `npm run format`, `npm run types:check` as needed.
- **Components**: Check for existing components before adding new ones (see [COMPONENTS.md](COMPONENTS.md)). Reuse layouts and UI primitives from `components/ui/`.

### File and component naming

- **Pages**: `resources/js/pages/` — match Inertia component name (e.g. `users/index.tsx` for `Inertia::render('users/index', ...)`).
- **Components**: PascalCase for components; kebab-case or PascalCase for file names (this project uses PascalCase or lowercase-with-dashes for files, e.g. `modern-page-layout.tsx`, `input-error.tsx`). Follow sibling files in the same folder.
- **Layouts**: Under `resources/js/layouts/` (e.g. `app-layout.tsx`, `settings/layout.tsx`).

### Routes and forms (Wayfinder)

- **Import**: Use `@/routes` for named routes and `@/actions` for invokable/controller actions (Wayfinder-generated).
- **Forms**: Prefer Wayfinder’s `.form()` with Inertia’s `<Form>` or `form.submit(routeOrAction())` with `useForm`. Keeps URLs and method in sync with Laravel.
- **Links**: Use Inertia `<Link>` (or the app’s `TextLink`) with Wayfinder-generated route functions for hrefs.

### State and data

- **Server state**: Page props from Inertia are the source of truth. Prefer them over duplicate client state when possible.
- **Flash messages**: Use shared `flash` props; show success/error in UI or via a component like `FlashMessageDialog` when appropriate.

---

## Tests

- **Framework**: Pest. Create tests with `php artisan make:test --pest Name`.
- **Run**: `php artisan test` or `php artisan test --compact --filter=TestName`. If the Artisan test command is not available, use `./vendor/bin/pest` (e.g. `./vendor/bin/pest --compact`).
- **Data**: Use model factories; avoid hardcoding IDs. For feature tests, hit HTTP/Inertia and assert on response or redirect.
- **Naming**: Descriptive test names; follow existing test file structure (e.g. feature tests in `tests/Feature/`).

---

## Documentation

- **Code**: PHPDoc for non-obvious public APIs; TypeScript types for component props when helpful.
- **Docs**: Keep [docs/](README.md) up to date when adding architecture, auth, or conventions. Document new reusable components in [COMPONENTS.md](COMPONENTS.md).

---

## Summary

| Area | Convention |
|------|------------|
| PHP style | Pint; types; Form Requests for validation |
| Controllers | Grouped by domain; Inertia render with minimal props |
| AuthZ | HasResourcePermission + resourcePermissionProps for resources |
| Config | config() in code; env() only in config files |
| Frontend | Wayfinder for routes/forms; reuse components; match Inertia page names |
| Tests | Pest; factories; feature tests for flows |
| Docs | Update docs/ and COMPONENTS.md when adding reusable or structural pieces |
