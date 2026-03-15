import { Form, Head, router, usePage } from '@inertiajs/react';
import { EllipsisVertical, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import FlashMessageDialog from '@/components/flash-message-dialog';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { ModernDialogLayout } from '@/components/modern-dialog-layout';
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
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import type { BreadcrumbItem } from '@/types';
import { edit } from '@/routes/profile';

const SYSTEM_MODULES_BASE = '/settings/system/modules';

type Module = {
    id: number;
    name: string;
    key: string;
    is_enabled: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: edit() },
    { title: 'System settings', href: '/settings/system' },
    { title: 'Modules', href: SYSTEM_MODULES_BASE },
];

type Props = {
    modules: Module[];
    canViewModule: boolean;
    canCreateModule: boolean;
    canUpdateModule: boolean;
    canDeleteModule: boolean;
    openModal?: string | null;
    openModalModuleId?: number | null;
};

type Flash = {
    modal?: string;
    modal_module_id?: number;
    success?: string;
    success_key?: number;
    error?: string;
    error_key?: number;
};

export default function SettingsSystemModulesIndex({
    modules,
    canViewModule,
    canCreateModule,
    canUpdateModule,
    canDeleteModule,
    openModal,
    openModalModuleId,
}: Props) {
    const { flash } = usePage().props as { flash?: Flash };
    const [moduleFormModal, setModuleFormModal] = useState<'create' | Module | null>(null);
    const [viewModule, setViewModule] = useState<Module | null>(null);
    const [deleteConfirmModule, setDeleteConfirmModule] = useState<Module | null>(null);
    const [successDismissed, setSuccessDismissed] = useState(false);
    const [errorDismissed, setErrorDismissed] = useState(false);

    useEffect(() => {
        if (flash?.error) return;
        const modal = openModal ?? flash?.modal;
        const moduleId = openModalModuleId ?? flash?.modal_module_id;
        queueMicrotask(() => {
            if (modal === 'create') {
                setModuleFormModal('create');
            } else if (modal === 'edit' && moduleId) {
                const m = modules.find((x) => x.id === moduleId);
                if (m) setModuleFormModal(m);
            } else if (modal === 'view' && moduleId) {
                const m = modules.find((x) => x.id === moduleId);
                if (m) setViewModule(m);
            }
        });
    }, [openModal, openModalModuleId, flash?.modal, flash?.modal_module_id, flash?.error, modules]);

    const isCreate = moduleFormModal === 'create';
    const editModule = moduleFormModal !== null && moduleFormModal !== 'create' ? moduleFormModal : null;

    useEffect(() => {
        if (flash?.success) queueMicrotask(() => setSuccessDismissed(false));
    }, [flash?.success, flash?.success_key]);
    useEffect(() => {
        if (flash?.error) queueMicrotask(() => setErrorDismissed(false));
    }, [flash?.error, flash?.error_key]);
    useEffect(() => {
        if (flash?.success || flash?.error) queueMicrotask(() => setModuleFormModal(null));
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
            <Head title="Modules" />
            <h1 className="sr-only">Modules settings</h1>
            <SettingsLayout>
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Heading
                            variant="small"
                            title="Modules"
                            description="Create and manage application modules"
                        />
                        {canCreateModule && (
                            <Button onClick={() => setModuleFormModal('create')}>
                                <Plus className="size-4" />
                                Add module
                            </Button>
                        )}
                    </div>
                    <div className="rounded-xl border border-border/60 dark:border-border">
                        <table className="w-full table-auto text-left text-sm">
                            <thead>
                                <tr className="border-b border-border/60 bg-muted/40 dark:border-border dark:bg-muted/20">
                                    <th className="w-12 px-4 py-3 font-medium text-muted-foreground">#</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Key</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                                    <th className="w-12 px-4 py-3 font-medium text-muted-foreground">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modules.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                            No modules yet.
                                        </td>
                                    </tr>
                                ) : (
                                    modules.map((mod, index) => (
                                        <tr
                                            key={mod.id}
                                            className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30 dark:border-border/50 dark:hover:bg-muted/10"
                                        >
                                            <td className="px-4 py-3 tabular-nums text-muted-foreground">
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-3 font-medium">{mod.name}</td>
                                            <td className="px-4 py-3 font-mono text-muted-foreground">{mod.key}</td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={
                                                        mod.is_enabled
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-muted-foreground'
                                                    }
                                                >
                                                    {mod.is_enabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {(canViewModule || canUpdateModule || canDeleteModule) && (
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
                                                            {canViewModule && (
                                                                <DropdownMenuItem onSelect={() => setViewModule(mod)}>
                                                                    <Eye className="size-4" />
                                                                    View
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canUpdateModule && (
                                                                <DropdownMenuItem onSelect={() => setModuleFormModal(mod)}>
                                                                    <Pencil className="size-4" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canDeleteModule && (
                                                                <DropdownMenuItem
                                                                    variant="destructive"
                                                                    onSelect={() => setDeleteConfirmModule(mod)}
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

            <Dialog open={!!deleteConfirmModule} onOpenChange={(open) => !open && setDeleteConfirmModule(null)}>
                <DialogContent>
                    {deleteConfirmModule && (
                        <ModernDialogLayout
                            title="Delete module"
                            description={
                                <>
                                    Are you sure you want to delete <strong>{deleteConfirmModule.name}</strong> (
                                    {deleteConfirmModule.key})? This cannot be undone.
                                </>
                            }
                            footer={
                                <>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            router.delete(`${SYSTEM_MODULES_BASE}/${deleteConfirmModule.id}`);
                                            setDeleteConfirmModule(null);
                                        }}
                                    >
                                        Delete
                                    </Button>
                                    <Button variant="outline" onClick={() => setDeleteConfirmModule(null)}>
                                        Cancel
                                    </Button>
                                </>
                            }
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!viewModule} onOpenChange={(open) => !open && setViewModule(null)}>
                <DialogContent className="sm:max-w-md">
                    {viewModule && (
                        <ModernDialogLayout
                            title={viewModule.name}
                            footer={
                                <>
                                    {canUpdateModule && (
                                        <Button
                                            onClick={() => {
                                                setViewModule(null);
                                                setModuleFormModal(viewModule);
                                            }}
                                        >
                                            Edit
                                        </Button>
                                    )}
                                    <Button variant="outline" onClick={() => setViewModule(null)}>
                                        Close
                                    </Button>
                                </>
                            }
                        >
                            <dl className="grid gap-3 text-sm">
                                <div>
                                    <dt className="font-medium text-muted-foreground">Name</dt>
                                    <dd className="mt-0.5">{viewModule.name}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Key</dt>
                                    <dd className="mt-0.5 font-mono">{viewModule.key}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-muted-foreground">Status</dt>
                                    <dd className="mt-0.5">
                                        {viewModule.is_enabled ? 'Enabled' : 'Disabled'}
                                    </dd>
                                </div>
                            </dl>
                        </ModernDialogLayout>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={moduleFormModal !== null} onOpenChange={(open) => !open && setModuleFormModal(null)}>
                <DialogContent className="sm:max-w-md">
                    {moduleFormModal !== null && (
                        <Form
                            action={isCreate ? SYSTEM_MODULES_BASE : `${SYSTEM_MODULES_BASE}/${editModule!.id}`}
                            method="post"
                            className="flex flex-col gap-4"
                        >
                            {({ processing, errors }) => (
                                <ModernDialogLayout
                                    title={isCreate ? 'Add module' : 'Edit module'}
                                    footer={
                                        <>
                                            <Button type="submit" disabled={processing}>
                                                {processing
                                                    ? isCreate
                                                        ? 'Creating…'
                                                        : 'Saving…'
                                                    : isCreate
                                                      ? 'Create module'
                                                      : 'Save changes'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setModuleFormModal(null)}
                                            >
                                                Cancel
                                            </Button>
                                        </>
                                    }
                                >
                                    {!isCreate && <input type="hidden" name="_method" value="PUT" />}
                                    <div className="flex flex-col gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="module-form-name">Name</Label>
                                            <Input
                                                id="module-form-name"
                                                type="text"
                                                name="name"
                                                required
                                                autoComplete="off"
                                                defaultValue={editModule?.name}
                                                placeholder="e.g. Dashboard"
                                            />
                                            <InputError message={errors.name} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="module-form-key">Key</Label>
                                            <Input
                                                id="module-form-key"
                                                type="text"
                                                name="key"
                                                required
                                                autoComplete="off"
                                                defaultValue={editModule?.key}
                                                placeholder="e.g. dashboard"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Lowercase letters, numbers and underscores only.
                                            </p>
                                            <InputError message={errors.key} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="hidden" name="is_enabled" value="0" />
                                            <input
                                                type="checkbox"
                                                id="module-form-is-enabled"
                                                name="is_enabled"
                                                value="1"
                                                defaultChecked={isCreate ? true : editModule?.is_enabled}
                                                className="size-4 rounded border-input"
                                            />
                                            <Label htmlFor="module-form-is-enabled" className="font-normal">
                                                Enabled
                                            </Label>
                                            <InputError message={errors.is_enabled} />
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
