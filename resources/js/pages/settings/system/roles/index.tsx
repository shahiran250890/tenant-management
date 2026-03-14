import { Form, Head, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';
import type { BreadcrumbItem } from '@/types';
import FlashMessageDialog from '@/components/flash-message-dialog';
import Heading from '@/components/heading';
import { EllipsisVertical, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
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

const SYSTEM_ROLES_BASE = '/settings/system/roles';

/** Spatie Permission (id, name, guard_name). */
type Permission = {
    id: number;
    name: string;
    guard_name: string;
};

/** Spatie Role from API (id, name, guard_name, permissions, ...). */
type Role = {
    id: number;
    name: string;
    guard_name: string;
    permissions?: Array<{ name: string }>;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: edit() },
    { title: 'System settings', href: '/settings/system' },
    { title: 'Roles', href: SYSTEM_ROLES_BASE },
];

type Props = {
    roles: Role[];
    permissions: Permission[];
    canCreateRole: boolean;
    canUpdateRole: boolean;
    canDeleteRole: boolean;
    canViewRole: boolean;
    openModal?: string | null;
    openModalRoleId?: number | null;
};

type Flash = {
    modal?: string;
    modal_role_id?: number;
    success?: string;
    success_key?: number;
    error?: string;
    error_key?: number;
};

function roleDisplayName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function permissionDisplayName(name: string): string {
    return name
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export default function SettingsSystemRolesIndex({
    roles,
    permissions,
    canCreateRole,
    canUpdateRole,
    canDeleteRole,
    canViewRole,
    openModal,
    openModalRoleId,
}: Props) {
    const { flash } = usePage().props as { flash?: Flash };
    const [roleFormModal, setRoleFormModal] = useState<'create' | Role | null>(null);
    const [viewRole, setViewRole] = useState<Role | null>(null);
    const [deleteConfirmRole, setDeleteConfirmRole] = useState<Role | null>(null);
    const [successDismissed, setSuccessDismissed] = useState(false);
    const [errorDismissed, setErrorDismissed] = useState(false);

    useEffect(() => {
        if (flash?.error) return;
        const modal = openModal ?? flash?.modal;
        const roleId = openModalRoleId ?? flash?.modal_role_id;
        if (modal === 'create') {
            setRoleFormModal('create');
        } else if (modal === 'edit' && roleId) {
            const r = roles.find((x) => x.id === roleId);
            if (r) setRoleFormModal(r);
        } else if (modal === 'view' && roleId) {
            const r = roles.find((x) => x.id === roleId);
            if (r) setViewRole(r);
        }
    }, [openModal, openModalRoleId, flash?.modal, flash?.modal_role_id, flash?.error, roles]);

    const isCreate = roleFormModal === 'create';
    const editRole = roleFormModal !== null && roleFormModal !== 'create' ? roleFormModal : null;

    useEffect(() => {
        if (flash?.success) setSuccessDismissed(false);
    }, [flash?.success, flash?.success_key]);
    useEffect(() => {
        if (flash?.error) setErrorDismissed(false);
    }, [flash?.error, flash?.error_key]);
    useEffect(() => {
        if (flash?.success || flash?.error) setRoleFormModal(null);
    }, [flash?.success, flash?.success_key, flash?.error, flash?.error_key]);

    const showSuccess = flash?.success && !successDismissed;
    const showError = flash?.error && !errorDismissed;
    const showFlashMessage = showSuccess || showError;
    const isSuccessFlash = !!flash?.success && !successDismissed;
    const flashMessage = flash?.success ?? flash?.error ?? '';

    const dismissFlash = useCallback(() => {
        setSuccessDismissed(true);
        setErrorDismissed(true);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles" />
            <h1 className="sr-only">Roles settings</h1>
            <SettingsLayout>
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Heading
                            variant="small"
                            title="Roles"
                            description="Manage application roles such as staff and finance"
                        />
                        {canCreateRole && (
                            <Button onClick={() => setRoleFormModal('create')}>
                                <Plus className="size-4" />
                                Add role
                            </Button>
                        )}
                    </div>
                    <div className="rounded-xl border border-border/60 dark:border-border">
                        <table className="w-full table-auto text-left text-sm">
                            <thead>
                                <tr className="border-b border-border/60 bg-muted/40 dark:border-border dark:bg-muted/20">
                                    <th className="w-12 px-4 py-3 font-medium text-muted-foreground">#</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                                    <th className="w-12 px-4 py-3 font-medium text-muted-foreground">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roles.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">
                                            No roles yet.
                                        </td>
                                    </tr>
                                ) : (
                                    roles.map((role, index) => (
                                        <tr
                                            key={role.id}
                                            className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30 dark:border-border/50 dark:hover:bg-muted/10"
                                        >
                                            <td className="px-4 py-3 tabular-nums text-muted-foreground">
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                {roleDisplayName(role.name)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {(canViewRole || canUpdateRole || canDeleteRole) && (
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
                                                            {canViewRole && (
                                                                <DropdownMenuItem onSelect={() => setViewRole(role)}>
                                                                    <Eye className="size-4" />
                                                                    View
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canUpdateRole && (
                                                                <DropdownMenuItem onSelect={() => setRoleFormModal(role)}>
                                                                    <Pencil className="size-4" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canDeleteRole && (
                                                                <DropdownMenuItem
                                                                    variant="destructive"
                                                                    onSelect={() => setDeleteConfirmRole(role)}
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
            </SettingsLayout>

            <FlashMessageDialog
                open={!!showFlashMessage}
                variant={isSuccessFlash ? 'success' : 'error'}
                message={flashMessage}
                onClose={dismissFlash}
                autoCloseMs={2000}
            />

            <Dialog open={!!deleteConfirmRole} onOpenChange={(open) => !open && setDeleteConfirmRole(null)}>
                <DialogContent>
                    {deleteConfirmRole && (
                        <ModernDialogLayout
                            title="Delete role"
                            description={
                                <>
                                    Are you sure you want to delete{' '}
                                    <strong>{roleDisplayName(deleteConfirmRole.name)}</strong>? This cannot be
                                    undone.
                                </>
                            }
                            footer={
                                <>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            router.delete(`${SYSTEM_ROLES_BASE}/${deleteConfirmRole.id}`);
                                            setDeleteConfirmRole(null);
                                        }}
                                    >
                                        Delete
                                    </Button>
                                    <Button variant="outline" onClick={() => setDeleteConfirmRole(null)}>
                                        Cancel
                                    </Button>
                                </>
                            }
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!viewRole} onOpenChange={(open) => !open && setViewRole(null)}>
                <DialogContent className="sm:max-w-md">
                    {viewRole && (
                        <ModernDialogLayout
                            title={roleDisplayName(viewRole.name)}
                            footer={
                                <>
                                    {canUpdateRole && (
                                        <Button
                                            onClick={() => {
                                                setViewRole(null);
                                                setRoleFormModal(viewRole);
                                            }}
                                        >
                                            Edit
                                        </Button>
                                    )}
                                    <Button variant="outline" onClick={() => setViewRole(null)}>
                                        Close
                                    </Button>
                                </>
                            }
                        >
                            <dl className="grid gap-3 text-sm">
                                <div>
                                    <dt className="font-medium text-muted-foreground">Name</dt>
                                    <dd className="mt-0.5">{roleDisplayName(viewRole.name)}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Guard</dt>
                                    <dd className="mt-0.5">{viewRole.guard_name}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Permissions</dt>
                                    <dd className="mt-0.5">
                                        {viewRole.permissions?.length
                                            ? viewRole.permissions.map((p) => permissionDisplayName(p.name)).join(', ')
                                            : '—'}
                                    </dd>
                                </div>
                            </dl>
                        </ModernDialogLayout>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={roleFormModal !== null} onOpenChange={(open) => !open && setRoleFormModal(null)}>
                <DialogContent className="sm:max-w-md">
                    {roleFormModal !== null && (
                        <Form
                            action={isCreate ? SYSTEM_ROLES_BASE : `${SYSTEM_ROLES_BASE}/${editRole!.id}`}
                            method="post"
                            className="flex flex-col gap-4"
                        >
                            {({ processing, errors }) => (
                                <ModernDialogLayout
                                    title={isCreate ? 'Add role' : 'Edit role'}
                                    footer={
                                        <>
                                            <Button type="submit" disabled={processing}>
                                                {processing
                                                    ? isCreate
                                                        ? 'Creating…'
                                                        : 'Saving…'
                                                    : isCreate
                                                        ? 'Create role'
                                                        : 'Save changes'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setRoleFormModal(null)}
                                            >
                                                Cancel
                                            </Button>
                                        </>
                                    }
                                >
                                    {!isCreate && <input type="hidden" name="_method" value="PUT" />}
                                    <div className="flex flex-col gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="role-form-name">Name</Label>
                                            <Input
                                                id="role-form-name"
                                                type="text"
                                                name="name"
                                                required
                                                autoComplete="off"
                                                defaultValue={editRole?.name}
                                                placeholder="e.g. staff, finance"
                                            />
                                            <InputError message={errors.name} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Permissions</Label>
                                            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border/60 p-3 dark:border-border">
                                                {permissions.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground">
                                                        No permissions defined. Add permissions first.
                                                    </p>
                                                ) : (
                                                    permissions.map((perm) => (
                                                        <label
                                                            key={perm.id}
                                                            className="flex cursor-pointer items-center gap-2 text-sm"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                name="permissions[]"
                                                                value={perm.name}
                                                                defaultChecked={
                                                                    isCreate
                                                                        ? false
                                                                        : editRole?.permissions?.some(
                                                                              (p) => p.name === perm.name,
                                                                          )
                                                                }
                                                                className="size-4 rounded border-input"
                                                            />
                                                            {permissionDisplayName(perm.name)}
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                            <InputError message={errors.permissions} />
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
