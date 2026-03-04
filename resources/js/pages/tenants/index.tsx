import { Head } from '@inertiajs/react';
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
import { EllipsisVertical, Eye, Pencil, Trash2 } from 'lucide-react';

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
    canAddTenant: boolean;
    canEditTenant: boolean;
    canDeleteTenant: boolean;
    canViewTenant: boolean;
    openModal?: string | null;
    openModalTenantId?: string | null;
};

export default function Tenants({
    tenants,
    canAddTenant,
    canEditTenant,
    canDeleteTenant,
    canViewTenant,
    openModal,
    openModalTenantId,
}: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tenants" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
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
                                    Database
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
                            {tenants.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-12 text-center text-muted-foreground"
                                    >
                                        No tenants yet.
                                    </td>
                                </tr>
                            ) : (
                                tenants.map((tenant, index) => (
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
                                            {tenant.database_name}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {tenant.is_active ? 'Active' : 'Inactive'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {(canViewTenant || canEditTenant || canDeleteTenant) && (
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
                                                            <DropdownMenuItem onSelect={() => {}}>
                                                                <Eye className="size-4" />
                                                                View
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canEditTenant && (
                                                            <DropdownMenuItem onSelect={() => {}}>
                                                                <Pencil className="size-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canDeleteTenant && (
                                                            <DropdownMenuItem
                                                                variant="destructive"
                                                                onSelect={() => {}}
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
        </AppLayout>
    );
}
