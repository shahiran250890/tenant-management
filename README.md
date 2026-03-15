# Tenant Management

A Laravel 12 application for managing tenants, users, roles, permissions, and modules. Built with Inertia.js (React), Tailwind CSS v4, Laravel Fortify, and Spatie Laravel Permission. Isolated and served via **Laravel Herd**.

## Requirements

- **PHP** 8.4
- **Laravel Herd** (project is Herd-isolated)
- **Composer** 2.x
- **Node.js** 18+ and npm
- **Database**: SQLite (default), MySQL, or PostgreSQL

## Installation

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd tenant-management
composer install
npm install
```

### 2. Environment setup

```bash
cp .env.example .env
php artisan key:generate
```

Configure your database in `.env`. Default uses SQLite; ensure `database/database.sqlite` exists or set `DB_*` for MySQL/PostgreSQL.

### 3. Database

```bash
php artisan migrate
php artisan db:seed
```

Seeding runs roles/permissions, tenant management data, and modules.

### 4. Build frontend assets

**Development** (with hot reload):

```bash
npm run dev
```

With Herd, the app is already served at `https://tenant-management.test`; just run `npm run dev` for asset hot-reload.

**Production build:**

```bash
npm run build
```

### Quick setup (all-in-one)

```bash
composer run setup
```

This runs `composer install`, copies `.env`, generates the app key, runs migrations, installs npm deps, and builds assets. You still need to run `php artisan db:seed` if you want seed data.

## Running the application

This project is **Herd-isolated**, so the site is already available via Herd—no `php artisan serve` needed.

- **URL**: `https://tenant-management.test` (Herd uses your project folder name in kebab-case).
- For frontend changes: run `npm run dev` (or `npm run build`) so Vite compiles assets; Herd serves the app.
- **Full dev stack** (queue, logs, Vite): `composer run dev` from the project root.

## Features

### Authentication (Laravel Fortify)

- Login / Register
- Email verification
- Forgot password / Reset password
- Two-factor authentication (2FA)
- Confirm password for sensitive actions

### User management

- List, create, edit, and delete users
- Enable/disable users (`PATCH /users/{user}/enabled`)
- User–role association (Spatie Permission)
- Disabled users are blocked from logging in

### Tenant management

- List, create, edit, and delete tenants
- Enable/disable tenants
- Assign modules to tenants (`PUT /tenants/{tenant}/modules`)
- Tenant details (e.g. database credentials stored encrypted)

### System settings (admin)

- **Roles**: CRUD for roles
- **Permissions**: CRUD for permissions
- **Modules**: CRUD for modules (assignable to tenants)
- **System**: System settings overview

### Account & profile

- Profile (view/edit, delete account)
- Password change
- Appearance (theme/settings)
- Two-factor authentication management

### Other

- Dashboard (authenticated home)
- Access denied page (e.g. when user is disabled or lacks permission)
- Permission-based access via `EnsureUserHasPermission` middleware and Spatie Permission

## Tech stack

| Layer        | Technology                          |
|-------------|--------------------------------------|
| Backend     | Laravel 12, PHP 8.4                 |
| Frontend    | React 19, Inertia.js v2, TypeScript  |
| Styling     | Tailwind CSS v4                      |
| Auth        | Laravel Fortify                      |
| Roles/Perms | Spatie Laravel Permission            |
| Routes (FE) | Laravel Wayfinder                    |

## Development

- **Tests**: `php artisan test` or `php artisan test --compact --filter=TestName`
- **Lint PHP**: `vendor/bin/pint --dirty --format agent` or `composer run lint`
- **Lint/format JS**: `npm run lint`, `npm run format`, `npm run types:check`
- **CI checks**: `composer run ci:check` (lint, format, types, tests)

## License

MIT.
