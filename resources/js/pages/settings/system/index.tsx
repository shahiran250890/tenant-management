import { Head, Link } from '@inertiajs/react';
import { Shield, KeyRound } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';
import type { BreadcrumbItem } from '@/types';

const SYSTEM_SETTINGS_BASE = '/settings/system';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: edit() },
    { title: 'System settings', href: SYSTEM_SETTINGS_BASE },
];

const systemLinks = [
    {
        title: 'Roles',
        description: 'Manage application roles and assign permissions',
        href: `${SYSTEM_SETTINGS_BASE}/roles`,
        icon: Shield,
    },
    {
        title: 'Permissions',
        description: 'Manage application permissions assigned to roles',
        href: `${SYSTEM_SETTINGS_BASE}/permissions`,
        icon: KeyRound,
    },
];

export default function SystemSettingsIndex() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="System settings" />
            <h1 className="sr-only">System settings</h1>
            <SettingsLayout>
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">
                            System settings
                        </h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Configure roles and permissions for your application.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {systemLinks.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="group flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border dark:border-border/60 dark:bg-card dark:shadow-none dark:hover:border-border/80"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-muted/80">
                                            <Icon className="size-5" strokeWidth={1.5} />
                                        </div>
                                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {item.description}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
