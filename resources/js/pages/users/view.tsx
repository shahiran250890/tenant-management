import { Head, Link } from '@inertiajs/react';
import { FormatDateTime } from '@/components/format-date-time';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import usersRoutes from '@/routes/users';
import type { BreadcrumbItem, User } from '@/types';

type UserWithRoles = User & { roles?: Array<{ name: string }> };

type Props = {
    user: UserWithRoles;
};

export default function View({ user }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Users', href: usersRoutes.index.url() },
        { title: user.name, href: usersRoutes.show.url(user.id) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={user.name} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                    <dl className="grid gap-3 text-sm">
                        <div>
                            <dt className="font-medium text-muted-foreground">Name</dt>
                            <dd className="mt-0.5">{user.name}</dd>
                        </div>
                        <div>
                            <dt className="font-medium text-muted-foreground">Email</dt>
                            <dd className="mt-0.5">{user.email}</dd>
                        </div>
                        <div>
                            <dt className="font-medium text-muted-foreground">Role(s)</dt>
                            <dd className="mt-0.5">
                                {user.roles?.length
                                    ? user.roles.map((r) => r.name.charAt(0).toUpperCase() + r.name.slice(1)).join(', ')
                                    : '—'}
                            </dd>
                        </div>
                        <div>
                            <dt className="font-medium text-muted-foreground">Created at</dt>
                            <dd className="mt-0.5">
                                <FormatDateTime value={user.created_at} />
                            </dd>
                        </div>
                    </dl>
                    <div className="mt-4 flex gap-2">
                        <Link href={usersRoutes.edit.url(user.id)}>
                            <span className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background shadow-xs h-9 px-4 py-2 hover:bg-accent hover:text-accent-foreground">
                                Edit
                            </span>
                        </Link>
                        <Link href={usersRoutes.index.url()}>
                            <span className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background shadow-xs h-9 px-4 py-2 hover:bg-accent hover:text-accent-foreground">
                                Back to users
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
