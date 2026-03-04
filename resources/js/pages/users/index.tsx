import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormatDateTime } from '@/components/format-date-time';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import usersRoutes from '@/routes/users';
import type { BreadcrumbItem, User } from '@/types';
import FlashMessageDialog from '@/components/flash-message-dialog';
import { EllipsisVertical, Eye, Pencil, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    canAddUser: boolean;
    canEditUser: boolean;
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
    canAddUser,
    canEditUser,
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
    // In edit mode, show password fields only after clicking "Change password".
    const [showPasswordInEdit, setShowPasswordInEdit] = useState(false);
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
            <Head title="Users" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                {/* Name filter, role filter, and Add user button */}
                <div className="flex flex-wrap items-center gap-3">
                    <Input
                        type="search"
                        placeholder="Filter by name or email"
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="max-w-md"
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
                        <SelectTrigger className="w-[11rem]" aria-label="Filter by role">
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
                    {canAddUser && (
                        <Button onClick={() => setUserFormModal('create')}>
                            <UserPlus className="size-4" />
                            Add user
                        </Button>
                    )}
                </div>
                {/* User list datatable */}
                <div className="rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full table-auto text-left text-sm">
                        <thead>
                            {/* Column headers: #, Name, Email, Role, Created At, Action */}
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
                                        colSpan={6}
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
                                            <FormatDateTime value={user.created_at} />
                                        </td>
                                        {/* Action dropdown: View / Edit / Delete, gated by canViewUser, canEditUser, canDeleteUser */}
                                        <td className="px-4 py-3">
                                            {(canViewUser || canEditUser || canDeleteUser) && (
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
                                                        {canEditUser && (
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
            </div>

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
                        <>
                            <DialogHeader>
                                <DialogTitle>Delete user</DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-muted-foreground">
                                Are you sure you want to delete <strong>{deleteConfirmUser.name}</strong>? This
                                cannot be undone.
                            </p>
                            <DialogFooter>
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
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* View user modal */}
            <Dialog open={!!viewUser} onOpenChange={(open) => !open && setViewUser(null)}>
                <DialogContent>
                    {viewUser && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{viewUser.name}</DialogTitle>
                            </DialogHeader>
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
                                    <dt className="font-medium text-muted-foreground">Created at</dt>
                                    <dd className="mt-0.5">
                                        <FormatDateTime value={viewUser.created_at} />
                                    </dd>
                                </div>
                            </dl>
                            <DialogFooter>
                                {canEditUser && (
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
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create / Edit user modal (shared) */}
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
                                <>
                                    <DialogHeader>
                                        <DialogTitle>{isCreate ? 'Add user' : 'Edit user'}</DialogTitle>
                                    </DialogHeader>
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
                                    <DialogFooter>
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
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
