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

const SYSTEM_PERMISSIONS_BASE = '/settings/system/permissions';

/** Spatie Permission from API (id, name, guard_name, ...). */
type Permission = {
    id: number;
    name: string;
    guard_name: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: edit() },
    { title: 'System settings', href: '/settings/system' },
    { title: 'Permissions', href: SYSTEM_PERMISSIONS_BASE },
];

type Props = {
    permissions: Permission[];
    canCreatePermission: boolean;
    canUpdatePermission: boolean;
    canDeletePermission: boolean;
    canViewPermission: boolean;
    openModal?: string | null;
    openModalPermissionId?: number | null;
};

type Flash = {
    modal?: string;
    modal_permission_id?: number;
    success?: string;
    success_key?: number;
    error?: string;
    error_key?: number;
};

function permissionDisplayName(name: string): string {
    return name
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export default function SettingsSystemPermissionsIndex({
    permissions,
    canCreatePermission,
    canUpdatePermission,
    canDeletePermission,
    canViewPermission,
    openModal,
    openModalPermissionId,
}: Props) {
    const { flash } = usePage().props as { flash?: Flash };
    const [permissionFormModal, setPermissionFormModal] = useState<'create' | Permission | null>(null);
    const [viewPermission, setViewPermission] = useState<Permission | null>(null);
    const [deleteConfirmPermission, setDeleteConfirmPermission] = useState<Permission | null>(null);
    const [successDismissed, setSuccessDismissed] = useState(false);
    const [errorDismissed, setErrorDismissed] = useState(false);

    useEffect(() => {
        if (flash?.error) return;
        const modal = openModal ?? flash?.modal;
        const permissionId = openModalPermissionId ?? flash?.modal_permission_id;
        if (modal === 'create') {
            setPermissionFormModal('create');
        } else if (modal === 'edit' && permissionId) {
            const p = permissions.find((x) => x.id === permissionId);
            if (p) setPermissionFormModal(p);
        } else if (modal === 'view' && permissionId) {
            const p = permissions.find((x) => x.id === permissionId);
            if (p) setViewPermission(p);
        }
    }, [
        openModal,
        openModalPermissionId,
        flash?.modal,
        flash?.modal_permission_id,
        flash?.error,
        permissions,
    ]);

    const isCreate = permissionFormModal === 'create';
    const editPermission =
        permissionFormModal !== null && permissionFormModal !== 'create' ? permissionFormModal : null;

    useEffect(() => {
        if (flash?.success) setSuccessDismissed(false);
    }, [flash?.success, flash?.success_key]);
    useEffect(() => {
        if (flash?.error) setErrorDismissed(false);
    }, [flash?.error, flash?.error_key]);
    useEffect(() => {
        if (flash?.success || flash?.error) setPermissionFormModal(null);
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
            <Head title="Permissions" />
            <h1 className="sr-only">Permissions settings</h1>
            <SettingsLayout>
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Heading
                            variant="small"
                            title="Permissions"
                            description="Manage application permissions assigned to roles"
                        />
                        {canCreatePermission && (
                            <Button onClick={() => setPermissionFormModal('create')}>
                                <Plus className="size-4" />
                                Add permission
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
                                {permissions.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={3}
                                            className="px-4 py-12 text-center text-muted-foreground"
                                        >
                                            No permissions yet.
                                        </td>
                                    </tr>
                                ) : (
                                    permissions.map((permission, index) => (
                                        <tr
                                            key={permission.id}
                                            className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30 dark:border-border/50 dark:hover:bg-muted/10"
                                        >
                                            <td className="px-4 py-3 tabular-nums text-muted-foreground">
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                {permissionDisplayName(permission.name)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {(canViewPermission ||
                                                    canUpdatePermission ||
                                                    canDeletePermission) && (
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
                                                            {canViewPermission && (
                                                                <DropdownMenuItem
                                                                    onSelect={() =>
                                                                        setViewPermission(permission)
                                                                    }
                                                                >
                                                                    <Eye className="size-4" />
                                                                    View
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canUpdatePermission && (
                                                                <DropdownMenuItem
                                                                    onSelect={() =>
                                                                        setPermissionFormModal(permission)
                                                                    }
                                                                >
                                                                    <Pencil className="size-4" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canDeletePermission && (
                                                                <DropdownMenuItem
                                                                    variant="destructive"
                                                                    onSelect={() =>
                                                                        setDeleteConfirmPermission(permission)
                                                                    }
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

            <Dialog
                open={!!deleteConfirmPermission}
                onOpenChange={(open) => !open && setDeleteConfirmPermission(null)}
            >
                <DialogContent>
                    {deleteConfirmPermission && (
                        <ModernDialogLayout
                            title="Delete permission"
                            description={
                                <>
                                    Are you sure you want to delete{' '}
                                    <strong>
                                        {permissionDisplayName(deleteConfirmPermission.name)}
                                    </strong>
                                    ? This cannot be undone.
                                </>
                            }
                            footer={
                                <>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            router.delete(
                                                `${SYSTEM_PERMISSIONS_BASE}/${deleteConfirmPermission.id}`,
                                            );
                                            setDeleteConfirmPermission(null);
                                        }}
                                    >
                                        Delete
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setDeleteConfirmPermission(null)}
                                    >
                                        Cancel
                                    </Button>
                                </>
                            }
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!viewPermission} onOpenChange={(open) => !open && setViewPermission(null)}>
                <DialogContent className="sm:max-w-md">
                    {viewPermission && (
                        <ModernDialogLayout
                            title={permissionDisplayName(viewPermission.name)}
                            footer={
                                <>
                                    {canUpdatePermission && (
                                        <Button
                                            onClick={() => {
                                                setViewPermission(null);
                                                setPermissionFormModal(viewPermission);
                                            }}
                                        >
                                            Edit
                                        </Button>
                                    )}
                                    <Button variant="outline" onClick={() => setViewPermission(null)}>
                                        Close
                                    </Button>
                                </>
                            }
                        >
                            <dl className="grid gap-3 text-sm">
                                <div>
                                    <dt className="font-medium text-muted-foreground">Name</dt>
                                    <dd className="mt-0.5">
                                        {permissionDisplayName(viewPermission.name)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Guard</dt>
                                    <dd className="mt-0.5">{viewPermission.guard_name}</dd>
                                </div>
                            </dl>
                        </ModernDialogLayout>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={permissionFormModal !== null}
                onOpenChange={(open) => !open && setPermissionFormModal(null)}
            >
                <DialogContent className="sm:max-w-md">
                    {permissionFormModal !== null && (
                        <Form
                            action={
                                isCreate
                                    ? SYSTEM_PERMISSIONS_BASE
                                    : `${SYSTEM_PERMISSIONS_BASE}/${editPermission!.id}`
                            }
                            method="post"
                            className="flex flex-col gap-4"
                        >
                            {({ processing, errors }) => (
                                <ModernDialogLayout
                                    title={isCreate ? 'Add permission' : 'Edit permission'}
                                    footer={
                                        <>
                                            <Button type="submit" disabled={processing}>
                                                {processing
                                                    ? isCreate
                                                        ? 'Creating…'
                                                        : 'Saving…'
                                                    : isCreate
                                                        ? 'Create permission'
                                                        : 'Save changes'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setPermissionFormModal(null)}
                                            >
                                                Cancel
                                            </Button>
                                        </>
                                    }
                                >
                                    {!isCreate && <input type="hidden" name="_method" value="PUT" />}
                                    <div className="grid gap-2">
                                        <Label htmlFor="permission-form-name">Name</Label>
                                        <Input
                                            id="permission-form-name"
                                            type="text"
                                            name="name"
                                            required
                                            autoComplete="off"
                                            defaultValue={editPermission?.name}
                                            placeholder="e.g. view reports"
                                        />
                                        <InputError message={errors.name} />
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
