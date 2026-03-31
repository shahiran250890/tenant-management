# Custom Components

Reference for app-specific React components. Use this when building new pages or when Cursor/other devs need to pick the right component and props.

- **Custom components**: `resources/js/components/` (this doc).
- **UI primitives**: `resources/js/components/ui/` — Radix-based building blocks (Button, Input, Dialog, Select, etc.). Use as needed; not listed here.

---

## Layout

### ModernPageLayout

Standard page wrapper: title, optional description, optional actions slot, and content area.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | Main content (required) |
| `title` | `string` | — | Page title (e.g. "Users", "Dashboard") |
| `description` | `string` | — | Subtitle below title |
| `actions` | `ReactNode` | — | Right-aligned actions (buttons, filters) |
| `className` | `string` | — | Outer wrapper class |
| `contentClassName` | `string` | — | Content area class |
| `variant` | `'default' \| 'compact'` | `'default'` | Spacing: default = comfortable, compact = tighter |
| `noPadding` | `boolean` | `false` | Remove padding (e.g. full-bleed tables) |

**Import:** `import { ModernPageLayout } from '@/components/modern-page-layout';`

**Example:**

```tsx
<ModernPageLayout
  title="Users"
  description="Manage user accounts"
  actions={<Button>Add user</Button>}
>
  {/* table or list */}
</ModernPageLayout>
```

---

### ModernDialogLayout

Layout for modal content: title, optional description, body, footer. Use **inside** `DialogContent`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `ReactNode` | — | Dialog title (required) |
| `description` | `ReactNode` | — | Subtitle |
| `children` | `ReactNode` | — | Main content |
| `footer` | `ReactNode` | — | Footer actions (buttons) |
| `contentClassName` | `string` | — | Body wrapper class |
| `className` | `string` | — | Root wrapper class |

**Import:** `import { ModernDialogLayout } from '@/components/modern-dialog-layout';`

**Example:**

```tsx
<DialogContent>
  <ModernDialogLayout
    title="Edit user"
    description="Update name and email"
    footer={<><Button variant="secondary">Cancel</Button><Button>Save</Button></>}
  >
    {/* form fields */}
  </ModernDialogLayout>
</DialogContent>
```

---

### AppShell

Root layout wrapper. Renders either a simple flex column (`variant="header"`) or `SidebarProvider` (`variant="sidebar"`). Reads `sidebarOpen` from Inertia page props.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | Layout content |
| `variant` | `'header' \| 'sidebar'` | `'header'` | Layout mode |

**Import:** `import { AppShell } from '@/components/app-shell';`

---

### AppContent

Main content area. With `variant="header"` renders a `<main>`; with `variant="sidebar"` renders `SidebarInset`. Pass through other `<main>` props as needed.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | Page content |
| `variant` | `'header' \| 'sidebar'` | `'header'` | Matches AppShell variant |
| …rest | `ComponentProps<'main'>` | — | Spread to underlying element |

**Import:** `import { AppContent } from '@/components/app-content';`

---

### AppHeader

Top bar: logo, breadcrumbs, nav links, user menu. Used in header-based layout.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `breadcrumbs` | `BreadcrumbItem[]` | `[]` | Items for breadcrumb trail |

**Import:** `import { AppHeader } from '@/components/app-header';`

**Type:** `BreadcrumbItem` from `@/types`: `{ title: string; href: string }`.

---

### AppSidebar

Collapsible sidebar: logo, main nav, footer links, user dropdown. Uses `NavMain`, `NavFooter`, `NavUser` internally. No props; nav items are defined inside the component.

**Import:** `import { AppSidebar } from '@/components/app-sidebar';`

---

### AppSidebarHeader

Header strip inside sidebar layout: sidebar trigger + breadcrumbs.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `breadcrumbs` | `BreadcrumbItem[]` | `[]` | Breadcrumb items |

**Import:** `import { AppSidebarHeader } from '@/components/app-sidebar-header';`

---

## Forms & validation

### InputError

Shows a single validation error message under a field. Renders nothing if `message` is falsy.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `message` | `string` | — | Error text (e.g. `errors.email` from Inertia) |
| `className` | `string` | `''` | Extra class |
| …rest | `HTMLAttributes<HTMLParagraphElement>` | — | Spread to `<p>` |

**Import:** `import InputError from '@/components/input-error';`

**Example:** `<InputError message={errors.password} />`

---

### AlertError

Block-level alert listing multiple errors (e.g. API or form errors).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `errors` | `string[]` | — | List of error messages |
| `title` | `string` | `'Something went wrong.'` | Alert title |

**Import:** `import AlertError from '@/components/alert-error';`

---

### StatusToggle

Controlled toggle for boolean form fields (e.g. Active/Inactive). Renders a hidden input for form submission and a switch-style button.

| Prop | Type | Description |
|------|------|-------------|
| `label` | `ReactNode` | Label above toggle (e.g. "Status") |
| `required` | `boolean` | Show required asterisk on label |
| `activeLabel` | `string` | Text when checked (e.g. "Active") |
| `inactiveLabel` | `string` | Text when unchecked (e.g. "Inactive") |
| `name` | `string` | Input name (submits "1" or "0") |
| `checked` | `boolean` | Controlled value |
| `onCheckedChange` | `(checked: boolean) => void` | Change handler |
| `error` | `string` | Validation error message |

**Import:** `import StatusToggle from '@/components/status-toggle';`

---

### EnableStatusToggle

Enable/disable pill that performs a PATCH request to toggle `is_enabled`, then shows SweetAlert and optionally reloads or runs a callback. Use for tenants, users, modules, etc.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `toggleUrl` | `string` | — | Full URL for PATCH (e.g. `/tenants/123/enabled`) |
| `isEnabled` | `boolean` | — | Current state |
| `canUpdate` | `boolean` | — | If false, renders read-only span |
| `onToggled` | `() => void` | `router.reload` | Called after successful toggle |
| `enabledTitle` | `string` | `'Enabled'` | SweetAlert title when enabled |
| `disabledTitle` | `string` | `'Disabled'` | SweetAlert title when disabled |
| `ariaLabel` | `string` | — | Optional aria-label for button |

**Import:** `import EnableStatusToggle from '@/components/enable-status-toggle';`

**Example:** `<EnableStatusToggle toggleUrl={url} isEnabled={tenant.is_enabled} canUpdate={true} />`

---

## Headings & links

### Heading

Section heading with optional description. Used on settings and other secondary pages.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Heading text |
| `description` | `string` | — | Subtitle below title |
| `variant` | `'default' \| 'small'` | `'default'` | default = larger + margin; small = compact |

**Import:** `import Heading from '@/components/heading';`

---

### TextLink

Inertia `Link` with app styling (underline, hover). Accepts all `Link` props.

**Import:** `import TextLink from '@/components/text-link';`

**Example:** `<TextLink href={login()}>Log in</TextLink>`

---

### FormatDateTime

Renders a date/time in the app’s standard format. Uses `@/lib/format-date-time`; shows "—" for null/undefined.

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string \| null \| undefined` | ISO date string |
| `className` | `string` | Optional class |

**Import:** `import { FormatDateTime } from '@/components/format-date-time';`

---

### Breadcrumbs

Renders a trail from `BreadcrumbItem[]`. Last item is current page (no link); others are Inertia links.

| Prop | Type | Description |
|------|------|-------------|
| `breadcrumbs` | `BreadcrumbItem[]` | `{ title: string; href: string }[]` |

**Import:** `import { Breadcrumbs } from '@/components/breadcrumbs';`

**Type:** `BreadcrumbItem` from `@/types/navigation`.

---

## Dialogs & feedback

### FlashMessageDialog

Modal for success or error flash messages. Optional auto-close.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | — | Whether dialog is open |
| `variant` | `'success' \| 'error'` | — | Icon and styling |
| `message` | `string` | — | Body text |
| `onClose` | `() => void` | — | Called on close (overlay, escape, or auto) |
| `autoCloseMs` | `number` | `2000` | Auto-close delay; 0 = no auto-close |
| `title` | `string` | From variant | Override dialog title |

**Import:** `import FlashMessageDialog from '@/components/flash-message-dialog';`

---

### SetupErrorLogDialog (pattern)

Tenant troubleshooting dialog pattern used in `tenants/index` to show persisted setup errors.

- **Purpose:** surface `tenant.setup_error` in a scrollable, read-only modal from the tenant action menu.
- **Trigger pattern:** show action only when `tenant.setup_error?.trim()` is truthy.
- **Layout pattern:** wrap content in `Dialog` + `DialogContent` + `ModernDialogLayout`.
- **Body pattern:** use a scrollable `<p>` (`whitespace-pre-wrap`, `break-words`, bounded max height) so long provisioning/migration errors remain readable.
- **Footer pattern:** single `Close` button (`variant="outline"`).

Typical usage state:
- `const [setupErrorTenant, setSetupErrorTenant] = useState<Tenant | null>(null);`

This is currently an inline page pattern (not a shared component). If reused in multiple pages, extract to `resources/js/components/setup-error-log-dialog.tsx`.

---

### DeleteUser

Self-contained “Delete account” section: warning text + dialog with password confirmation. Uses Wayfinder `ProfileController.destroy.form()`. No props.

**Import:** `import DeleteUser from '@/components/delete-user';`

**Usage:** Place on profile/settings page; no props needed.

---

## User & auth

### UserInfo

Avatar + name (and optional email). Uses `useInitials` for fallback.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `user` | `User` | — | User from `@/types` (name, email, avatar) |
| `showEmail` | `boolean` | `false` | Show email below name |

**Import:** `import { UserInfo } from '@/components/user-info';`

---

### UserMenuContent

Dropdown content: user info, Settings link, Log out. Expects `user` and uses `logout`, `edit` (profile) routes. Used inside `AppHeader` and `NavUser`.

| Prop | Type | Description |
|------|------|-------------|
| `user` | `User` | Current user |

**Import:** `import { UserMenuContent } from '@/components/user-menu-content';`

---

### TwoFactorRecoveryCodes

Card for viewing/regenerating 2FA recovery codes. Manages visibility and calls `fetchRecoveryCodes` / `regenerateRecoveryCodes` route.

| Prop | Type | Description |
|------|------|-------------|
| `recoveryCodesList` | `string[]` | List of codes (or empty while loading) |
| `fetchRecoveryCodes` | `() => Promise<void>` | Fetches codes (e.g. from backend) |
| `errors` | `string[]` | Errors to show via AlertError |

**Import:** `import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';`

---

### TwoFactorSetupModal

Dialog for enabling 2FA: QR code / manual key step, then optional verification step. Controlled by parent (open/close, data fetching).

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Whether modal is open |
| `onClose` | `() => void` | Close handler |
| `requiresConfirmation` | `boolean` | Whether to show verification step |
| `twoFactorEnabled` | `boolean` | 2FA already enabled state |
| `qrCodeSvg` | `string \| null` | SVG string for QR code |
| `manualSetupKey` | `string \| null` | Manual entry key |
| `clearSetupData` | `() => void` | Clear setup state on close |
| `fetchSetupData` | `() => Promise<void>` | Load QR/key when opening |
| `errors` | `string[]` | Errors to display |

**Import:** `import TwoFactorSetupModal from '@/components/two-factor-setup-modal';`

---

## Appearance

### AppearanceTabs (AppearanceToggleTab)

Light / Dark / System theme toggle. Uses `useAppearance`; forwards div props and `className`. Default export name in file is `AppearanceToggleTab`; typically imported as `AppearanceTabs`.

**Import:** `import AppearanceTabs from '@/components/appearance-tabs';`

---

## Branding

### AppLogo

Sidebar/header logo: icon + “Laravel Starter Kit” text. No props.

**Import:** `import AppLogo from '@/components/app-logo';`

---

### AppLogoIcon

SVG logo icon only. Accepts `SVGAttributes<SVGElement>` (e.g. `className`, `width`, `height`).

**Import:** `import AppLogoIcon from '@/components/app-logo-icon';`

---

## Navigation (sidebar)

### NavMain

Renders a sidebar group “Platform” with a list of nav items. Uses `useCurrentUrl` for active state.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `NavItem[]` | `[]` | `{ title, href, icon?, isActive? }` |

**Import:** `import { NavMain } from '@/components/nav-main';`

**Type:** `NavItem` from `@/types`: `{ title: string; href: string; icon?: LucideIcon \| null; isActive?: boolean }`.

---

### NavFooter

Sidebar group of external links (e.g. repo, docs). Opens in new tab.

| Prop | Type | Description |
|------|------|-------------|
| `items` | `NavItem[]` | Same shape as NavMain |
| …rest | `ComponentPropsWithoutRef<SidebarGroup>` | e.g. `className` |

**Import:** `import { NavFooter } from '@/components/nav-footer';`

---

### NavUser

Sidebar user block: avatar, name, dropdown with `UserMenuContent`. Reads `auth.user` from Inertia page props. No props.

**Import:** `import { NavUser } from '@/components/nav-user';`

---

## Types

- **BreadcrumbItem** (`@/types` or `@/types/navigation`): `{ title: string; href: string }`.
- **NavItem** (`@/types`): `{ title: string; href: string; icon?: LucideIcon \| null; isActive?: boolean }`.
- **User** (`@/types`): Auth user shape (name, email, avatar, etc.).

Layout and dialog types are also exported from `@/components/modern-page-layout` and `@/components/modern-dialog-layout`; re-exported in `resources/js/types/ui.ts` as `ModernPageLayoutProps` and `ModernDialogLayoutProps`.

---

## UI primitives (`components/ui/`)

Use these for low-level building blocks. Not documented here; inspect the component files or Radix docs.

- **Layout:** card, separator, sheet, sidebar, skeleton.
- **Forms:** button, input, label, checkbox, select, toggle, toggle-group, input-otp.
- **Overlays:** dialog, dropdown-menu, tooltip, alert.
- **Data:** avatar, badge, breadcrumb (raw), navigation-menu.
- **Other:** icon, placeholder-pattern, spinner, collapsible.

When in doubt, check sibling components in the same page or layout for usage patterns.
