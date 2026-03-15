/**
 * Users index page – list, create, edit, delete users and manage roles.
 * Status (is_enabled) can be toggled via EnableStatusToggle (AJAX + SweetAlert).
 */
import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormatDateTime } from '@/components/format-date-time';
import { ModernPageLayout } from '@/components/modern-page-layout';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import usersRoutes from '@/routes/users';
import type { BreadcrumbItem, User } from '@/types';
import FlashMessageDialog from '@/components/flash-message-dialog';
import EnableStatusToggle from '@/components/enable-status-toggle';
import { EllipsisVertical, Eye, Pencil, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ModernDialogLayout } from '@/components/modern-dialog-layout';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StatusToggle from '@/components/status-toggle';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

/** Sentinel value for "All roles" in the role filter (Radix Select does not support empty string). */
const ROLE_FILTER_ALL = '__all__';

// Breadcrumb trail for the users index page.
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
    },
    {
        title: 'Users',
        href: '/users',
    },
];

/** User with roles loaded (Spatie). */
type UserWithRoles = User & { roles?: Array<{ name: string }> };

/** Inertia page props passed from UserController::index. */
type Props = {
    users: UserWithRoles[];
    roles: string[];
    canCreateUser: boolean;
    canUpdateUser: boolean;
    canDeleteUser: boolean;
    canViewUser: boolean;
    openModal?: string | null;
    openModalUserId?: number | null;
};

type Flash = {
    modal?: string;
    modal_user_id?: number;
    success?: string;
    success_key?: number;
    error?: string;
    error_key?: number;
};

export default function Index({
    users,
    roles,
    canCreateUser,
    canUpdateUser,
    canDeleteUser,
    canViewUser,
    openModal,
    openModalUserId,
}: Props) {
    const { flash } = usePage().props as { flash?: Flash };

    // Client-side filter by name/email (case-insensitive) and by role.
    const [nameFilter, setNameFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState(ROLE_FILTER_ALL);
    // Role dropdown: open state and search query (so we can search inside the dropdown).
    const [roleFilterOpen, setRoleFilterOpen] = useState(false);
    const [roleSearchQuery, setRoleSearchQuery] = useState('');
    const roleSearchInputRef = useRef<HTMLInputElement>(null);
    // User shown in the view modal (null = modal closed).
    const [viewUser, setViewUser] = useState<UserWithRoles | null>(null);
    // Create/edit user modal: 'create' | user to edit | null (closed).
    const [userFormModal, setUserFormModal] = useState<'create' | UserWithRoles | null>(null);

    // Open modal from URL or flash (e.g. after redirect or validation error). Don't re-open on error.
    useEffect(() => {
        if (flash?.error) return;
        const modal = openModal ?? flash?.modal;
        const userId = openModalUserId ?? flash?.modal_user_id;
        if (modal === 'create') {
            setUserFormModal('create');
        } else if (modal === 'edit' && userId) {
            const u = users.find((x) => x.id === userId);
            if (u) setUserFormModal(u);
        } else if (modal === 'view' && userId) {
            const u = users.find((x) => x.id === userId);
            if (u) setViewUser(u);
        }
    }, [openModal, openModalUserId, flash?.modal, flash?.modal_user_id, flash?.error, users]);

    const isCreate = userFormModal === 'create';
    const editUser = userFormModal !== null && userFormModal !== 'create' ? userFormModal : null;
    // Enable/disable toggle in create/edit form; synced when modal opens.
    const [isUserEnabled, setIsUserEnabled] = useState(true);
    // In edit mode, show password fields only after clicking "Change password".
    const [showPasswordInEdit, setShowPasswordInEdit] = useState(false);

    useEffect(() => {
        if (userFormModal === 'create') {
            setIsUserEnabled(true);
        } else if (editUser) {
            setIsUserEnabled(editUser.is_enabled);
        }
    }, [userFormModal, editUser]);
    const [successDismissed, setSuccessDismissed] = useState(false);
    const [errorDismissed, setErrorDismissed] = useState(false);
    const showSuccess = flash?.success && !successDismissed;
    const showError = flash?.error && !errorDismissed;
    const showFlashMessage = showSuccess || showError;
    const isSuccessFlash = !!flash?.success && !successDismissed;
    const flashMessage = flash?.success ?? flash?.error ?? '';

    // Reset success dismissed when a new success is flashed.
    useEffect(() => {
        if (flash?.success) setSuccessDismissed(false);
    }, [flash?.success, flash?.success_key]);
    // Reset error dismissed when a new error is flashed.
    useEffect(() => {
        if (flash?.error) setErrorDismissed(false);
    }, [flash?.error, flash?.error_key]);
    // Close form modal and reset password UI on success or error redirect.
    useEffect(() => {
        if (flash?.success || flash?.error) {
            setUserFormModal(null);
            setShowPasswordInEdit(false);
        }
    }, [flash?.success, flash?.success_key, flash?.error, flash?.error_key]);

    const dismissFlash = useCallback(() => {
        setSuccessDismissed(true);
        setErrorDismissed(true);
    }, []);

    // User pending delete confirmation (null = confirmation dialog closed).
    const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserWithRoles | null>(null);

    // Unique role names from all users, sorted; filtered by search for dropdown.
    const roleOptions = useMemo(() => {
        const names = new Set<string>();
        users.forEach((user) =>
            user.roles?.forEach((r) => names.add(r.name)),
        );
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [users]);
    const filteredRoleOptions = useMemo(() => {
        const q = roleSearchQuery.trim().toLowerCase();
        if (!q) return roleOptions;
        return roleOptions.filter((name) =>
            name.toLowerCase().includes(q),
        );
    }, [roleOptions, roleSearchQuery]);
    const filteredUsers = users.filter((user) => {
        const q = nameFilter.trim().toLowerCase();
        if (q && !user.name.toLowerCase().includes(q) && !user.email.toLowerCase().includes(q)) {
            return false;
        }
        if (roleFilter !== ROLE_FILTER_ALL && !user.roles?.some((r) => r.name === roleFilter)) {
            return false;
        }
        return true;
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            {/* Page title and actions: name/email filter, role filter, Add user. */}
            <Head title="Users" />
            <ModernPageLayout
                title="Users"
                description="Manage user accounts and roles"
                actions={
                    <div className="flex items-center gap-2 flex-nowrap">
                        <Input
                            type="search"
                            placeholder="Filter by name or email"
                            value={nameFilter}
                            onChange={(e) => setNameFilter(e.target.value)}
                            className="min-w-0 shrink sm:min-w-[20rem] sm:max-w-xl"
                            aria-label="Filter users by name or email"
                        />
                        <Select
                            value={roleFilter}
                            onValueChange={setRoleFilter}
                            open={roleFilterOpen}
                            onOpenChange={(open) => {
                                setRoleFilterOpen(open);
                                if (!open) setRoleSearchQuery('');
                                else setTimeout(() => roleSearchInputRef.current?.focus(), 0);
                            }}
                        >
                            <SelectTrigger className="w-[11rem] shrink-0" aria-label="Filter by role">
                                <SelectValue placeholder="All roles" />
                            </SelectTrigger>
                            <SelectContent>
                                <div className="border-b border-sidebar-border/70 px-2 pb-2 dark:border-sidebar-border">
                                    <Input
                                        ref={roleSearchInputRef}
                                        type="search"
                                        placeholder="Search roles..."
                                        value={roleSearchQuery}
                                        onChange={(e) => setRoleSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        className="h-8"
                                        aria-label="Search roles"
                                    />
                                </div>
                                <SelectItem value={ROLE_FILTER_ALL}>All roles</SelectItem>
                                {filteredRoleOptions.length === 0 && roleSearchQuery.trim() ? (
                                    <SelectItem value="__no_match__" disabled>
                                        No roles match
                                    </SelectItem>
                                ) : (
                                    filteredRoleOptions.map((name) => (
                                        <SelectItem key={name} value={name}>
                                            {name.charAt(0).toUpperCase() + name.slice(1)}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        {canCreateUser && (
                            <Button onClick={() => setUserFormModal('create')} className="shrink-0">
                                <UserPlus className="size-4" />
                                Add user
                            </Button>
                        )}
                    </div>
                }
                contentClassName="min-h-0">
                {/* Users table: #, Name, Email, Role, Status (EnableStatusToggle), Created At, Action. */}
                <div className="rounded-xl border border-border/60 dark:border-border">
                    <table className="w-full table-auto text-left text-sm">
                        <thead>
                            {/* Column headers: #, Name, Email, Role, Status, Created At, Action */}
                            <tr className="border-b border-sidebar-border/70 bg-muted/40 dark:border-sidebar-border dark:bg-muted/20">
                                <th className="w-12 px-4 py-3 font-medium text-muted-foreground">
                                    #
                                </th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">
                                    Name
                                </th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">
                                    Email
                                </th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">
                                    Role
                                </th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">
                                    Status
                                </th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">
                                    Created At
                                </th>
                                <th className="w-12 px-4 py-3 font-medium text-muted-foreground">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Empty state when there are no users or no match */}
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-12 text-center text-muted-foreground"
                                    >
                                        {users.length === 0
                                            ? 'No users yet.'
                                            : 'No users match your filter.'}
                                    </td>
                                </tr>
                            ) : (
                                /* Data rows: index, name, email, role, created_at, action */
                                filteredUsers.map((user, index) => (
                                    <tr
                                        key={user.id}
                                        className="border-b border-sidebar-border/50 transition-colors last:border-0 hover:bg-muted/30 dark:border-sidebar-border/50 dark:hover:bg-muted/10"
                                    >
                                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            {user.name}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {user.email}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {user.roles?.map((r) => r.name.charAt(0).toUpperCase() + r.name.slice(1)).join(', ') || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            <EnableStatusToggle
                                                toggleUrl={`/users/${user.id}/enabled`}
                                                isEnabled={user.is_enabled}
                                                canUpdate={canUpdateUser}
                                                enabledTitle="User is enabled"
                                                disabledTitle="User is disabled"
                                                ariaLabel={
                                                    user.is_enabled
                                                        ? 'Disable user (click to toggle)'
                                                        : 'Enable user (click to toggle)'
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            <FormatDateTime value={user.created_at} />
                                        </td>
                                        {/* Action dropdown: View / Edit / Delete, gated by canViewUser, canUpdateUser, canDeleteUser */}
                                        <td className="px-4 py-3">
                                            {(canViewUser || canUpdateUser || canDeleteUser) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8"
                                                            aria-label="Open actions"
                                                        >
                                                            <EllipsisVertical className="size-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {canViewUser && (
                                                            <DropdownMenuItem
                                                                onSelect={() => setViewUser(user)}
                                                            >
                                                                <Eye className="size-4" />
                                                                View
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canUpdateUser && (
                                                            <DropdownMenuItem
                                                                onSelect={() => setUserFormModal(user)}
                                                            >
                                                                <Pencil className="size-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canDeleteUser && (
                                                            <DropdownMenuItem
                                                                variant="destructive"
                                                                onSelect={() => setDeleteConfirmUser(user)}
                                                            >
                                                                <Trash2 className="size-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </ModernPageLayout>

            {/* Global flash for create/update/delete success or error. */}
            <FlashMessageDialog
                open={!!showFlashMessage}
                variant={isSuccessFlash ? 'success' : 'error'}
                message={flashMessage}
                onClose={dismissFlash}
                autoCloseMs={2000}
            />

            {/* Delete user confirmation dialog */}
            <Dialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
                <DialogContent>
                    {deleteConfirmUser && (
                        <ModernDialogLayout
                            title="Delete user"
                            description={
                                <>
                                    Are you sure you want to delete <strong>{deleteConfirmUser.name}</strong>?
                                    This cannot be undone.
                                </>
                            }
                            footer={
                                <>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            router.delete(usersRoutes.destroy.url(deleteConfirmUser.id));
                                            setDeleteConfirmUser(null);
                                        }}
                                    >
                                        Delete
                                    </Button>
                                    <Button variant="outline" onClick={() => setDeleteConfirmUser(null)}>
                                        Cancel
                                    </Button>
                                </>
                            }
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* View user modal – read-only: email, roles, status, created at. */}
            <Dialog open={!!viewUser} onOpenChange={(open) => !open && setViewUser(null)}>
                <DialogContent className="sm:max-w-md">
                    {viewUser && (
                        <ModernDialogLayout
                            title={viewUser.name}
                            footer={
                                <>
                                    {canUpdateUser && (
                                        <Button
                                            onClick={() => {
                                                setViewUser(null);
                                                setUserFormModal(viewUser);
                                            }}
                                        >
                                            Edit
                                        </Button>
                                    )}
                                    <Button variant="outline" onClick={() => setViewUser(null)}>
                                        Close
                                    </Button>
                                </>
                            }
                        >
                            <dl className="grid gap-3 text-sm">
                                <div>
                                    <dt className="font-medium text-muted-foreground">Email</dt>
                                    <dd className="mt-0.5">{viewUser.email}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Role(s)</dt>
                                    <dd className="mt-0.5">
                                        {viewUser.roles?.length
                                            ? viewUser.roles.map((r) => r.name.charAt(0).toUpperCase() + r.name.slice(1)).join(', ')
                                            : '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Status</dt>
                                    <dd className="mt-0.5">
                                        <EnableStatusToggle
                                            toggleUrl={`/users/${viewUser.id}/enabled`}
                                            isEnabled={viewUser.is_enabled}
                                            canUpdate={canUpdateUser}
                                            enabledTitle="User is enabled"
                                            disabledTitle="User is disabled"
                                            ariaLabel={
                                                viewUser.is_enabled
                                                    ? 'Disable user (click to toggle)'
                                                    : 'Enable user (click to toggle)'
                                            }
                                        />
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Created at</dt>
                                    <dd className="mt-0.5">
                                        <FormatDateTime value={viewUser.created_at} />
                                    </dd>
                                </div>
                            </dl>
                        </ModernDialogLayout>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create / Edit user modal – shared form: name, email, password, role. */}
            <Dialog
                open={userFormModal !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setUserFormModal(null);
                        setShowPasswordInEdit(false);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    {userFormModal !== null && (
                        <Form
                            {...(isCreate
                                ? usersRoutes.store.form()
                                : usersRoutes.update.form(editUser!.id))}
                            className="flex flex-col gap-4"
                        >
                            {({ processing, errors }) => (
                                <ModernDialogLayout
                                    title={isCreate ? 'Add user' : 'Edit user'}
                                    footer={
                                        <>
                                            <Button type="submit" disabled={processing}>
                                                {processing
                                                    ? isCreate
                                                        ? 'Creating…'
                                                        : 'Saving…'
                                                    : isCreate
                                                        ? 'Create user'
                                                        : 'Save changes'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setUserFormModal(null)}
                                            >
                                                Cancel
                                            </Button>
                                        </>
                                    }
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="user-form-name">Name</Label>
                                            <Input
                                                id="user-form-name"
                                                type="text"
                                                name="name"
                                                required
                                                autoComplete="name"
                                                defaultValue={editUser?.name}
                                                placeholder="Full name"
                                            />
                                            <InputError message={errors.name} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="user-form-email">Email</Label>
                                            <Input
                                                id="user-form-email"
                                                type="email"
                                                name="email"
                                                required
                                                autoComplete="email"
                                                defaultValue={editUser?.email}
                                                placeholder="email@example.com"
                                            />
                                            <InputError message={errors.email} />
                                        </div>
                                        {isCreate || showPasswordInEdit ? (
                                            <>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="user-form-password">Password</Label>
                                                    <Input
                                                        id="user-form-password"
                                                        type="password"
                                                        name="password"
                                                        required={isCreate}
                                                        autoComplete="new-password"
                                                        placeholder={isCreate ? 'Password' : 'Leave blank to keep current'}
                                                    />
                                                    <InputError message={errors.password} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="user-form-password_confirmation">
                                                        Confirm password
                                                    </Label>
                                                    <Input
                                                        id="user-form-password_confirmation"
                                                        type="password"
                                                        name="password_confirmation"
                                                        required={isCreate}
                                                        autoComplete="new-password"
                                                        placeholder={isCreate ? 'Confirm password' : 'Leave blank to keep current'}
                                                    />
                                                    <InputError message={errors.password_confirmation} />
                                                </div>
                                            </>
                                        ) : (
                                            <div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setShowPasswordInEdit(true)}
                                                >
                                                    Change password
                                                </Button>
                                            </div>
                                        )}
                                        <StatusToggle
                                            label="Status"
                                            activeLabel="Enabled"
                                            inactiveLabel="Disabled"
                                            name="is_enabled"
                                            checked={isUserEnabled}
                                            onCheckedChange={setIsUserEnabled}
                                            error={errors.is_enabled}
                                        />
                                        <div className="grid gap-2">
                                            <Label htmlFor="user-form-role">Role</Label>
                                            <select
                                                id="user-form-role"
                                                name="role"
                                                defaultValue={editUser?.roles?.[0]?.name ?? ''}
                                                className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                <option value="">No role</option>
                                                {roles.map((name) => (
                                                    <option key={name} value={name}>
                                                        {name.charAt(0).toUpperCase() + name.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                            <InputError message={errors.role} />
                                        </div>
                                    </div>
                                </ModernDialogLayout>
                            )}
                        </Form>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
