import { Head, Link } from '@inertiajs/react';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard() },
    { title: 'Access denied', href: '/access-denied' },
];

export default function AccessDenied() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Access denied" />
            <div className="flex h-full flex-1 flex-col items-center justify-center gap-6 rounded-xl p-8 text-center">
                <div className="rounded-full bg-destructive/10 p-4">
                    <ShieldX className="size-12 text-destructive" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold">Access denied</h1>
                    <p className="max-w-md text-muted-foreground">
                        You do not have permission to access this page.
                    </p>
                </div>
                <Button asChild>
                    <Link href={dashboard()}>Back to dashboard</Link>
                </Button>
            </div>
        </AppLayout>
    );
}
