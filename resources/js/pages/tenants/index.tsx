/**
 * Tenants index page – list, create, edit, delete tenants and manage per-tenant modules.
 * Uses Inertia + React; tenant status (is_enabled) can be toggled via AJAX with SweetAlert feedback.
 */
import { Form, Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Database, EllipsisVertical, Eye, Layers, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import EnableStatusToggle from '@/components/enable-status-toggle';
import FlashMessageDialog from '@/components/flash-message-dialog';
import { FormatDateTime } from '@/components/format-date-time';
import InputError from '@/components/input-error';
import { ModernDialogLayout } from '@/components/modern-dialog-layout';
import { ModernPageLayout } from '@/components/modern-page-layout';
import StatusDisplayBadge from '@/components/status-display-badge';
import StatusToggle from '@/components/status-toggle';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import tenantsRoutes from '@/routes/tenants';
import type { BreadcrumbItem, Tenant } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
    }, {
        title: 'Tenants',
        href: '/tenants',
    }
];

/** Tenant with modules (pivot is_enabled per tenant). */
type TenantWithModules = Tenant & {
    modules?: Array<{
        id: number;
        name: string;
        key: string;
        pivot: { is_enabled: boolean };
    }>;
};

type Module = {
    id: number;
    name: string;
    key: string;
    is_enabled: boolean;
};

type Application = {
    id: number;
    code: string;
    name: string;
    is_enabled: boolean;
};

/** Inertia page props passed from TenantManagementController::index. */
type Props = {
    tenants: TenantWithModules[];
    modules: Module[];
    applications: Application[];
    canCreateTenant: boolean;
    canUpdateTenant: boolean;
    canDeleteTenant: boolean;
    canViewTenant: boolean;
    openModal?: string | null;
    openModalTenantId?: string | null;
};

function isEnabledForTenant(tenant: TenantWithModules, moduleId: number): boolean {
    const m = tenant.modules?.find((x) => x.id === moduleId);
    const value = m?.pivot?.is_enabled as boolean | number | undefined;
    return value === true || value === 1;
}

function formatSetupStatus(status: string | undefined, stage: string | null | undefined): string {
    if (status === 'ready') {
        return 'Ready';
    }

    if (status === 'failed') {
        return stage ? `Failed (${stage})` : 'Failed';
    }

    return stage ? `Provisioning (${stage})` : 'Provisioning';
}

function setupStatusBadgeClass(status: string | undefined): 'success' | 'error' | 'warning' {
    if (status === 'ready') {
        return 'success';
    }

    if (status === 'failed') {
        return 'error';
    }

    return 'warning';
}

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
    modules,
    applications,
    canCreateTenant,
    canUpdateTenant,
    canDeleteTenant,
    canViewTenant,
    openModal,
    openModalTenantId,
}: Props) {
    const { flash } = usePage().props as { flash?: Flash };

    // Modals: create/edit tenant form, manage modules, view tenant, delete confirm.
    const [tenantFormModal, setTenantFormModal] = useState<'create' | TenantWithModules | null>(null);
    const [modulesModalTenant, setModulesModalTenant] = useState<TenantWithModules | null>(null);
    const [viewTenant, setViewTenant] = useState<Tenant | null>(null);
    const [setupErrorTenant, setSetupErrorTenant] = useState<Tenant | null>(null);
    const [isEnabled, setIsEnabled] = useState(true);
    const [hosts, setHosts] = useState<string[]>(['']);
    const [applicationId, setApplicationId] = useState<string>('');

    // Sync form state when create vs edit modal opens (isEnabled, hosts from tenant).
    useEffect(() => {
        queueMicrotask(() => {
            if (tenantFormModal === 'create') {
                setIsEnabled(true);
                setHosts(['']);
                setApplicationId(applications[0]?.id.toString() ?? '');
            } else if (tenantFormModal !== null) {
                setIsEnabled(tenantFormModal.is_enabled);
                setApplicationId(tenantFormModal.application_id?.toString() ?? '');
                const domainValues =
                    tenantFormModal.domains?.map((d) => d.domain).filter(Boolean) ?? [];
                setHosts(domainValues.length > 0 ? domainValues : ['']);
            }
        });
    }, [tenantFormModal]);

    // Open modal from URL or flash (e.g. after redirect or validation error). Don't re-open on error so form stays closed.
    useEffect(() => {
        if (flash?.error) return;
        const modal = openModal ?? flash?.modal;
        const tenantId = openModalTenantId ?? flash?.modal_tenant_id;
        queueMicrotask(() => {
            if (modal === 'create') {
                setTenantFormModal('create');
            } else if (modal === 'edit' && tenantId) {
                const t = tenants.find((x) => x.id === tenantId);
                if (t) setTenantFormModal(t);
            } else if (modal === 'view' && tenantId) {
                const t = tenants.find((x) => x.id === tenantId);
                if (t) setViewTenant(t);
            } else if (modal === 'modules' && tenantId) {
                const t = tenants.find((x) => x.id === tenantId);
                if (t) setModulesModalTenant(t);
            }
        });
    }, [openModal, openModalTenantId, flash?.modal, flash?.modal_tenant_id, flash?.error, tenants]);

    const isCreate = tenantFormModal === 'create';
    const editTenant = tenantFormModal !== null && tenantFormModal !== 'create' ? tenantFormModal : null;
    const [errorDismissed, setErrorDismissed] = useState(false);
    const [successDismissed, setSuccessDismissed] = useState(false);
    const showError = flash?.error && !errorDismissed;
    const showSuccess = flash?.success && !successDismissed;

    // Reset error dismissed when a new error is flashed (e.g. after another failed update).
    useEffect(() => {
        if (flash?.error) queueMicrotask(() => setErrorDismissed(false));
    }, [flash?.error, flash?.error_key]);

    // Long errors (e.g. from Create tenant user or Run migrations) are shown in a scrollable confirm dialog below.
    const isLongError =
        !!flash?.error &&
        (flash.error.length > 100 ||
            flash.error.includes('Run tenant migrations') ||
            flash.error.includes('Ensure tenant user failed') ||
            flash.error.includes('Tenant schema is out of date'));
    const showLongErrorDialog = showError && isLongError;

    // Reset success dismissed when a new success is flashed (e.g. after create/update).
    useEffect(() => {
        if (flash?.success) queueMicrotask(() => setSuccessDismissed(false));
    }, [flash?.success, flash?.success_key]);

    // Close form modal after success or error redirect (store/update).
    useEffect(() => {
        if (flash?.success || flash?.error) {
            queueMicrotask(() => {
                setTenantFormModal(null);
                setModulesModalTenant(null);
            });
        }
    }, [flash?.success, flash?.success_key, flash?.error, flash?.error_key]);

    const showFlashMessage = showSuccess || (showError && !isLongError);
    const isSuccess = !!flash?.success && !successDismissed;
    const flashMessage = flash?.success ?? flash?.error ?? '';

    const dismissFlash = useCallback(() => {
        setSuccessDismissed(true);
        setErrorDismissed(true);
    }, []);

    const [deleteConfirmTenant, setDeleteConfirmTenant] = useState<Tenant | null>(null);
    const [nameFilter, setNameFilter] = useState('');

    // Filter tenants by name (client-side).
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
            <ModernPageLayout
                title="Tenants"
                description="Manage tenant organizations"
                actions={
                    <div className="flex items-center gap-2 flex-nowrap">
                        <Input
                            type="search"
                            placeholder="Filter by name"
                            value={nameFilter}
                            onChange={(e) => setNameFilter(e.target.value)}
                            className="min-w-0 shrink sm:min-w-[20rem] sm:max-w-xl"
                            aria-label="Filter tenants by name"
                        />
                        {canCreateTenant && (
                            <Button onClick={() => setTenantFormModal('create')} className="shrink-0">
                                <Plus className="size-4" />
                                New tenant
                            </Button>
                        )}
                    </div>
                }
                contentClassName="min-h-0">
                {/* Tenants table: #, Name, Host, Status (clickable when can update), Action menu. */}
                <div className="rounded-xl border border-border/60 dark:border-border">
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
                                <th className="px-4 py-3 font-medium text-muted-foreground">
                                    Setup Status
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
                                        colSpan={6}
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
                                            {tenant.domains?.length
                                                ? tenant.domains.map((d) => d.domain).join(', ')
                                                : tenant.host ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            <EnableStatusToggle
                                                toggleUrl={`/tenants/${tenant.id}/enabled`}
                                                isEnabled={tenant.is_enabled}
                                                canUpdate={canUpdateTenant}
                                                enabledTitle="Tenant is enabled"
                                                disabledTitle="Tenant is disabled"
                                                ariaLabel={
                                                    tenant.is_enabled
                                                        ? 'Disable tenant (click to toggle)'
                                                        : 'Enable tenant (click to toggle)'
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            <StatusDisplayBadge
                                                label={formatSetupStatus(tenant.setup_status, tenant.setup_stage)}
                                                tone={setupStatusBadgeClass(tenant.setup_status)}
                                            />
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
                                                        {canUpdateTenant && tenant.setup_error?.trim() && (
                                                            <DropdownMenuItem onSelect={() => setSetupErrorTenant(tenant)}>
                                                                <AlertTriangle className="size-4" />
                                                                Setup error log
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canUpdateTenant && (
                                                            <DropdownMenuItem
                                                                onSelect={() =>
                                                                    router.post(
                                                                        `/tenants/${tenant.id}/run-migrations`,
                                                                    )
                                                                }
                                                            >
                                                                <Database className="size-4" />
                                                                Run migrations
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canUpdateTenant && (
                                                            <DropdownMenuItem
                                                                onSelect={() =>
                                                                    router.post(
                                                                        `/tenants/${tenant.id}/create-tenant-user`,
                                                                    )
                                                                }
                                                            >
                                                                <UserPlus className="size-4" />
                                                                Create tenant user
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canUpdateTenant && (
                                                            <DropdownMenuItem onSelect={() => setModulesModalTenant(tenant)}>
                                                                <Layers className="size-4" />
                                                                Manage modules
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
            </ModernPageLayout>

            {/* Global flash for create/update/delete success or short error. Long errors use the confirm dialog below. */}
            <FlashMessageDialog
                open={!!showFlashMessage}
                variant={isSuccess ? 'success' : 'error'}
                message={flashMessage}
                onClose={dismissFlash}
                autoCloseMs={1500}
            />

            {/* Long error confirm dialog (e.g. Create tenant user / Run migrations failure). */}
            <Dialog open={!!showLongErrorDialog} onOpenChange={(open) => !open && dismissFlash()}>
                <DialogContent className="sm:max-w-lg">
                    {flash?.error && (
                        <ModernDialogLayout
                            title="Error"
                            description={
                                <p
                                    className="text-left whitespace-pre-wrap break-words max-h-64 overflow-y-auto text-sm text-muted-foreground"
                                    style={{ maxHeight: '16rem' }}
                                >
                                    {flash.error}
                                </p>
                            }
                            footer={
                                <Button onClick={dismissFlash}>OK</Button>
                            }
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete tenant confirmation dialog */}
            <Dialog open={!!deleteConfirmTenant} onOpenChange={(open) => !open && setDeleteConfirmTenant(null)}>
                <DialogContent>
                    {deleteConfirmTenant && (
                        <ModernDialogLayout
                            title="Delete tenant"
                            description={
                                <>
                                    Are you sure you want to delete <strong>{deleteConfirmTenant.name}</strong>?
                                    This cannot be undone.
                                </>
                            }
                            footer={
                                <>
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
                                </>
                            }
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* View tenant modal – read-only details (hosts, storage, DB, status, timestamps). */}
            <Dialog open={!!viewTenant} onOpenChange={(open) => !open && setViewTenant(null)}>
                <DialogContent className="sm:max-w-md">
                    {viewTenant && (
                        <ModernDialogLayout
                            title={viewTenant.name}
                            footer={
                                <>
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
                                </>
                            }
                        >
                            <dl className="grid gap-3 text-sm">
                                <div>
                                    <dt className="font-medium text-muted-foreground">Hosts</dt>
                                    <dd className="mt-0.5">
                                        {viewTenant.domains?.length
                                            ? viewTenant.domains.map((d) => d.domain).join(', ')
                                            : viewTenant.host || '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Storage domain</dt>
                                    <dd className="mt-0.5">{viewTenant.storage_domain || '—'}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Application</dt>
                                    <dd className="mt-0.5">{viewTenant.application?.name ?? viewTenant.application?.code ?? '—'}</dd>
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
                                    <dd className="mt-0.5">
                                        <EnableStatusToggle
                                            toggleUrl={`/tenants/${viewTenant.id}/enabled`}
                                            isEnabled={viewTenant.is_enabled}
                                            canUpdate={false}
                                        />
                                    </dd>
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
                        </ModernDialogLayout>
                    )}
                </DialogContent>
            </Dialog>

            {/* Setup error log modal – read-only setup failure details for troubleshooting. */}
            <Dialog open={!!setupErrorTenant} onOpenChange={(open) => !open && setSetupErrorTenant(null)}>
                <DialogContent className="sm:max-w-lg">
                    {setupErrorTenant && (
                        <ModernDialogLayout
                            title={`Setup error log: ${setupErrorTenant.name}`}
                            description={
                                <p
                                    className="text-left whitespace-pre-wrap break-words max-h-64 overflow-y-auto text-sm text-muted-foreground"
                                    style={{ maxHeight: '16rem' }}
                                >
                                    {setupErrorTenant.setup_error || 'No setup error found.'}
                                </p>
                            }
                            footer={(
                                <Button variant="outline" onClick={() => setSetupErrorTenant(null)}>
                                    Close
                                </Button>
                            )}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Create / Edit tenant modal – shared form (name, hosts, storage_domain, is_enabled). */}
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
                                <ModernDialogLayout
                                    title={isCreate ? 'Add Tenant' : `Edit ${editTenant?.name}`}
                                    footer={
                                        <>
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
                                        </>
                                    }
                                >
                                    <div className="flex flex-col gap-4">
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
                                            <div className="flex items-center justify-between">
                                                <Label>Hosts</Label>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setHosts((prev) => [...prev, ''])}
                                                >
                                                    <Plus className="mr-1 size-3.5" />
                                                    Add host
                                                </Button>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {hosts.map((host, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex gap-2 items-center"
                                                    >
                                                        <Input
                                                            type="text"
                                                            name={`hosts[${i}]`}
                                                            autoComplete="off"
                                                            defaultValue={host}
                                                            placeholder="example.com"
                                                            className="flex-1"
                                                        />
                                                        {hosts.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="shrink-0 size-9"
                                                                aria-label="Remove host"
                                                                onClick={() =>
                                                                    setHosts((prev) =>
                                                                        prev.filter((_, j) => j !== i)
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <InputError
                                                message={
                                                    errors.hosts ??
                                                    Object.entries(errors).find(([k]) =>
                                                        k.startsWith('hosts.')
                                                    )?.[1]
                                                }
                                            />
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
                                        <div className="grid gap-2">
                                            <Label htmlFor="project-application" required>Application</Label>
                                            <input type="hidden" name="application_id" value={applicationId} />
                                            <Select
                                                required
                                                value={applicationId}
                                                onValueChange={setApplicationId}
                                            >
                                                <SelectTrigger id="project-application">
                                                    <SelectValue placeholder="Select application" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {applications.map((app) => (
                                                        <SelectItem key={app.id} value={app.id.toString()}>
                                                            {app.name} ({app.code})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.application_id} />
                                        </div>
                                        <StatusToggle
                                            label="Status"
                                            activeLabel="Enabled"
                                            inactiveLabel="Disabled"
                                            name="is_enabled"
                                            checked={isEnabled}
                                            onCheckedChange={setIsEnabled}
                                            error={errors.is_enabled}
                                        />
                                    </div>

                                </ModernDialogLayout>
                            )}
                        </Form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Manage modules dialog – enable/disable modules for one tenant (pivot is_enabled). */}
            <Dialog open={!!modulesModalTenant} onOpenChange={(open) => !open && setModulesModalTenant(null)}>
                <DialogContent className="sm:max-w-md">
                    {modulesModalTenant && (
                        <Form
                            key={modulesModalTenant.id}
                            action={`/tenants/${modulesModalTenant.id}/modules`}
                            method="post"
                            className="flex flex-col gap-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <input type="hidden" name="_method" value="PUT" />
                                    <ModernDialogLayout
                                        title={`Modules for ${modulesModalTenant.name}`}
                                        description="Enable or disable modules for this tenant."
                                        footer={
                                            <>
                                                <Button type="submit" disabled={processing}>
                                                    {processing ? 'Saving…' : 'Save changes'}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setModulesModalTenant(null)}
                                                >
                                                    Cancel
                                                </Button>
                                            </>
                                        }
                                    >
                                        <div className="max-h-60 space-y-3 overflow-y-auto">
                                            {modules.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">
                                                    No modules defined. Add modules in System settings
                                                    first.
                                                </p>
                                            ) : (
                                                modules.map((mod) => (
                                                    <div
                                                        key={mod.id}
                                                        className="flex items-center gap-2 rounded-md border border-border/60 p-2 dark:border-border"
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name={`modules[${mod.id}][id]`}
                                                            value={mod.id}
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name={`modules[${mod.id}][is_enabled]`}
                                                            value="0"
                                                        />
                                                        <input
                                                            type="checkbox"
                                                            id={`module-${modulesModalTenant.id}-${mod.id}`}
                                                            name={`modules[${mod.id}][is_enabled]`}
                                                            value="1"
                                                            defaultChecked={isEnabledForTenant(
                                                                modulesModalTenant,
                                                                mod.id,
                                                            )}
                                                            className="size-4 rounded border-input"
                                                        />
                                                        <Label
                                                            htmlFor={`module-${modulesModalTenant.id}-${mod.id}`}
                                                            className="flex-1 cursor-pointer font-normal"
                                                        >
                                                            {mod.name}
                                                            <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                                                                ({mod.key})
                                                            </span>
                                                        </Label>
                                                    </div>
                                                ))
                                            )}
                                            {errors?.modules && (
                                                <p className="text-sm text-destructive">
                                                    {errors.modules}
                                                </p>
                                            )}
                                        </div>
                                    </ModernDialogLayout>
                                </>
                            )}
                        </Form>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
