# Documentation index

Entry point for system documentation. Use this to find where concepts are explained.

## System at a glance

**Tenant Management** is a Laravel 12 + Inertia.js (React) app for managing tenants, users, roles, permissions, and modules. Authentication is handled by Laravel Fortify (login, 2FA, password reset). Authorization uses Spatie Laravel Permission (roles and permissions). The frontend is a React SPA with shared layout (sidebar or header), and backend routes are exposed to TypeScript via Laravel Wayfinder.

---

## Documentation map

| Document | Contents |
|----------|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Request flow, Laravel + Inertia, auth/tenant boundaries, shared data |
| [CODEBASE.md](CODEBASE.md) | Folder structure and where to add new features (pages, controllers, components) |
| [COMPONENTS.md](COMPONENTS.md) | Custom React components: props, usage, examples |
| [AUTH-AND-PERMISSIONS.md](AUTH-AND-PERMISSIONS.md) | Login, 2FA, enabled users, roles/permissions, middleware |
| [DATA-MODELS.md](DATA-MODELS.md) | Main entities (User, Tenant, Module, etc.) and relationships |
| [CONVENTIONS.md](CONVENTIONS.md) | Naming, patterns, and style (PHP/TS, Form Requests, Wayfinder) |

---

## Quick links

- **Project README**: [../README.md](../README.md) — install, run, features, tech stack
- **Custom components**: [COMPONENTS.md](COMPONENTS.md) — when building or referencing UI components
