import { FormatDateTime } from '@/components/format-date-time';
import { Form, Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem, Tenant } from '@/types';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import FlashMessageDialog from '@/components/flash-message-dialog';
import { EllipsisVertical, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import tenantsRoutes from '@/routes/tenants';
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
    }, {
        title: 'Tenants',
        href: '/tenants',
    }
];

/** Inertia page props passed from TenantManagementController::index. */
type Props = {
    tenants: Tenant[];
    canCreateTenant: boolean;
    canUpdateTenant: boolean;
    canDeleteTenant: boolean;
    canViewTenant: boolean;
    openModal?: string | null;
    openModalTenantId?: string | null;
};

type Flash = {
    modal?: string;
    modal_tenant_id?: number;
    success?: string;
    success_key?: number;
    error?: string;
    error_key?: number;
};

export default function Tenants({
    tenants,
    canCreateTenant,
    canUpdateTenant,
    canDeleteTenant,
    canViewTenant,
    openModal,
    openModalTenantId,
}: Props) {
    const { flash } = usePage().props as { flash?: Flash };
    const [tenantFormModal, setTenantFormModal] = useState<'create' | Tenant | null>(null);
    const [isActive, setIsActive] = useState(true);

    // Sync isActive when modal opens (create vs edit).
    useEffect(() => {
        if (tenantFormModal === 'create') setIsActive(true);
        else if (tenantFormModal !== null) setIsActive(tenantFormModal.is_active);
    }, [tenantFormModal]);

    // Open modal from URL or flash (e.g. after redirect or validation error). Don't re-open on error so form stays closed.
    useEffect(() => {
        if (flash?.error) return;
        const modal = openModal ?? flash?.modal;
        const tenantId = openModalTenantId ?? flash?.modal_tenant_id;
        if (modal === 'create') {
            setTenantFormModal('create');
        } else if (modal === 'edit' && tenantId) {
            const t = tenants.find((x) => x.id === tenantId);
            if (t) setTenantFormModal(t);
        }
    }, [openModal, openModalTenantId, flash?.modal, flash?.modal_tenant_id, flash?.error, tenants]);

    const isCreate = tenantFormModal === 'create';
    const editTenant = tenantFormModal !== null && tenantFormModal !== 'create' ? tenantFormModal : null;
    const [errorDismissed, setErrorDismissed] = useState(false);
    const [successDismissed, setSuccessDismissed] = useState(false);
    const showError = flash?.error && !errorDismissed;
    const showSuccess = flash?.success && !successDismissed;

    // Reset error dismissed when a new error is flashed (e.g. after another failed update).
    useEffect(() => {
        if (flash?.error) setErrorDismissed(false);
    }, [flash?.error, flash?.error_key]);

    // Reset success dismissed when a new success is flashed (e.g. after create/update).
    useEffect(() => {
        if (flash?.success) setSuccessDismissed(false);
    }, [flash?.success, flash?.success_key]);

    // Close form modal after success or error redirect (store/update).
    useEffect(() => {
        if (flash?.success || flash?.error) {
            setTenantFormModal(null);
        }
    }, [flash?.success, flash?.success_key, flash?.error, flash?.error_key]);

    const showFlashMessage = showSuccess || showError;
    const isSuccess = !!flash?.success && !successDismissed;
    const flashMessage = flash?.success ?? flash?.error ?? '';

    const dismissFlash = useCallback(() => {
        setSuccessDismissed(true);
        setErrorDismissed(true);
    }, []);

    const [deleteConfirmTenant, setDeleteConfirmTenant] = useState<Tenant | null>(null);
    const [viewTenant, setViewTenant] = useState<Tenant | null>(null);
    const [nameFilter, setNameFilter] = useState('');
    const filteredTenants = useMemo(() => {
        const q = nameFilter.trim().toLowerCase();
        if (!q) return tenants;
        return tenants.filter((tenant) =>
            tenant.name.toLowerCase().includes(q),
        );
    }, [tenants, nameFilter]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tenants" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Input
                        type="search"
                        placeholder="Filter by name"
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="max-w-md"
                        aria-label="Filter tenants by name"
                    />
                    {canCreateTenant && (
                        <Button onClick={() => setTenantFormModal('create')}>
                            <Plus className="size-4" />
                            New tenant
                        </Button>
                    )}
                </div>
                <div className="rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full table-auto text-left text-sm">
                        <thead>
                            <tr className="border-b border-sidebar-border/70 bg-muted/40 dark:border-sidebar-border dark:bg-muted/20">
                                <th className="w-12 px-4 py-3 font-medium text-muted-foreground">
                                    #
                                </th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">
                                    Name
                                </th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">
                                    Host
                                </th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">
                                    Status
                                </th>
                                <th className="w-12 px-4 py-3 font-medium text-muted-foreground">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTenants.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-12 text-center text-muted-foreground"
                                    >
                                        {tenants.length === 0
                                            ? 'No tenants yet.'
                                            : 'No tenants match your filter.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredTenants.map((tenant, index) => (
                                    <tr
                                        key={tenant.id}
                                        className="border-b border-sidebar-border/50 transition-colors last:border-0 hover:bg-muted/30 dark:border-sidebar-border/50 dark:hover:bg-muted/10"
                                    >
                                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            {tenant.name}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {tenant.host}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {tenant.is_active ? 'Active' : 'Inactive'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {(canViewTenant || canUpdateTenant || canDeleteTenant) && (
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
                                                        {canViewTenant && (
                                                            <DropdownMenuItem onSelect={() => setViewTenant(tenant)}>
                                                                <Eye className="size-4" />
                                                                View
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canUpdateTenant && (
                                                            <DropdownMenuItem onSelect={() => setTenantFormModal(tenant)}>
                                                                <Pencil className="size-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canDeleteTenant && (
                                                            <DropdownMenuItem
                                                                variant="destructive"
                                                                onSelect={() => setDeleteConfirmTenant(tenant)}
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
                variant={isSuccess ? 'success' : 'error'}
                message={flashMessage}
                onClose={dismissFlash}
                autoCloseMs={1500}
            />

            {/* Delete tenant confirmation dialog */}
            <Dialog open={!!deleteConfirmTenant} onOpenChange={(open) => !open && setDeleteConfirmTenant(null)}>
                <DialogContent>
                    {deleteConfirmTenant && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Delete tenant</DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-muted-foreground">
                                Are you sure you want to delete <strong>{deleteConfirmTenant.name}</strong>? This
                                cannot be undone.
                            </p>
                            <DialogFooter>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        router.delete(tenantsRoutes.destroy.url(deleteConfirmTenant.id));
                                        setDeleteConfirmTenant(null);
                                    }}
                                >
                                    Delete
                                </Button>
                                <Button variant="outline" onClick={() => setDeleteConfirmTenant(null)}>
                                    Cancel
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* View tenant modal */}
            <Dialog open={!!viewTenant} onOpenChange={(open) => !open && setViewTenant(null)}>
                <DialogContent className="sm:max-w-md">
                    {viewTenant && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{viewTenant.name}</DialogTitle>
                            </DialogHeader>
                            <dl className="grid gap-3 text-sm">
                                <div>
                                    <dt className="font-medium text-muted-foreground">Host</dt>
                                    <dd className="mt-0.5">{viewTenant.host || '—'}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Storage domain</dt>
                                    <dd className="mt-0.5">{viewTenant.storage_domain || '—'}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Database name</dt>
                                    <dd className="mt-0.5">{viewTenant.database_name || '—'}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Database username</dt>
                                    <dd className="mt-0.5">{viewTenant.database_username || '—'}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Database password</dt>
                                    <dd className="mt-0.5">••••••••</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Database host</dt>
                                    <dd className="mt-0.5">{viewTenant.database_host || '—'}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Database port</dt>
                                    <dd className="mt-0.5">{viewTenant.database_port ?? '—'}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Status</dt>
                                    <dd className="mt-0.5">{viewTenant.is_active ? 'Active' : 'Inactive'}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Created at</dt>
                                    <dd className="mt-0.5">
                                        <FormatDateTime value={viewTenant.created_at} />
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Updated at</dt>
                                    <dd className="mt-0.5">
                                        <FormatDateTime value={viewTenant.updated_at} />
                                    </dd>
                                </div>
                            </dl>
                            <DialogFooter>
                                {canUpdateTenant && (
                                    <Button
                                        onClick={() => {
                                            setViewTenant(null);
                                            setTenantFormModal(viewTenant);
                                        }}
                                    >
                                        Edit
                                    </Button>
                                )}
                                <Button variant="outline" onClick={() => setViewTenant(null)}>
                                    Close
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create / Edit user modal (shared) */}
            <Dialog
                open={tenantFormModal !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setTenantFormModal(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    {tenantFormModal !== null && (
                        <Form
                            {...(isCreate
                                ? tenantsRoutes.store.form()
                                : tenantsRoutes.update.form(editTenant!.id))}
                            className="flex flex-col gap-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <DialogHeader>
                                        <DialogTitle>{isCreate ? 'Add Tenant' : `Edit ${editTenant?.name}`}</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-2">
                                        <Label htmlFor="user-form-name" required>Name</Label>
                                        <Input
                                            id="user-form-name"
                                            type="text"
                                            name="name"
                                            required
                                            autoComplete="name"
                                            defaultValue={editTenant?.name}
                                            placeholder="Full name"
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="user-form-host" required>Host</Label>
                                        <Input
                                            id="user-form-host"
                                            type="text"
                                            name="host"
                                            required
                                            autoComplete="host"
                                            defaultValue={editTenant?.host}
                                            placeholder="test.example.com"
                                        />
                                        <InputError message={errors.host} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="user-form-storage-domain" required>Storage Domain</Label>
                                        <Input
                                            id="user-form-storage-domain"
                                            type="text"
                                            name="storage_domain"
                                            required
                                            autoComplete="storage_domain"
                                            defaultValue={editTenant?.storage_domain}
                                            placeholder="sample_storage"
                                        />
                                        <InputError message={errors.storage_domain} />
                                    </div>
                                    <StatusToggle
                                        label="Status"
                                        activeLabel="Active"
                                        inactiveLabel="Inactive"
                                        name="is_active"
                                        checked={isActive}
                                        onCheckedChange={setIsActive}
                                        error={errors.is_active}
                                    />

                                    <DialogFooter>
                                        <Button type="submit" disabled={processing}>
                                            {processing
                                                ? isCreate
                                                    ? 'Creating…'
                                                    : 'Saving…'
                                                : isCreate
                                                    ? 'Create tenant'
                                                    : 'Save changes'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setTenantFormModal(null)}
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
