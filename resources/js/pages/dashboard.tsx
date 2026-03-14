import { Head } from '@inertiajs/react';
import { Users, Building2, Shield } from 'lucide-react';
import { ModernPageLayout } from '@/components/modern-page-layout';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
    },
];

interface DashboardProps {
    userCount: number;
}

const statCards: Array<{
    label: string;
    getValue: (userCount: number) => number;
    icon: typeof Users;
    accent: string;
}> = [
    {
        label: 'Total Users',
        getValue: (count) => count,
        icon: Users,
        accent: 'bg-[var(--color-chart-1)]',
    },
    {
        label: 'Total Tenants',
        getValue: () => 0,
        icon: Building2,
        accent: 'bg-[var(--color-chart-2)]',
    },
    {
        label: 'Active Roles',
        getValue: () => 0,
        icon: Shield,
        accent: 'bg-[var(--color-chart-3)]',
    },
];

export default function Dashboard({ userCount }: DashboardProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <ModernPageLayout
                title="Dashboard"
                description="Overview of your system"
                contentClassName="gap-6"
            >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {statCards.map((card) => {
                        const Icon = card.icon;
                        const value = card.getValue(userCount);
                        return (
                            <div
                                key={card.label}
                                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border dark:border-border/60 dark:bg-card dark:shadow-none dark:hover:border-border/80"
                            >
                                <div className={`absolute right-4 top-4 h-10 w-10 rounded-xl ${card.accent} opacity-15 transition-opacity group-hover:opacity-25`} />
                                <div className="relative">
                                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        {card.label}
                                    </p>
                                    <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">
                                        {value}
                                    </p>
                                </div>
                                <div className="relative mt-4 flex items-center gap-2">
                                    <div className={`h-1 w-8 rounded-full ${card.accent}`} />
                                    <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="relative min-h-[22rem] flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm dark:border-border/60 dark:bg-card dark:shadow-none">
                    <div className="flex h-full min-h-[20rem] flex-col p-5 md:p-6">
                        <div className="mb-6 flex flex-col gap-0.5">
                            <h2 className="text-lg font-semibold tracking-tight text-foreground">
                                Revenue overview
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Sample finance trend — Jan to Dec
                            </p>
                        </div>
                        <div className="relative flex-1 min-h-[12rem]">
                            <svg
                                className="size-full"
                                viewBox="0 0 400 160"
                                preserveAspectRatio="none"
                                aria-label="Sample finance line chart"
                            >
                                <defs>
                                    <linearGradient id="finance-gradient" x1="0" x2="0" y1="1" y2="0">
                                        <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity="0.35" />
                                        <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d="M 0 120 Q 50 100 100 80 T 200 60 T 300 40 T 400 20 L 400 160 L 0 160 Z"
                                    fill="url(#finance-gradient)"
                                />
                                <path
                                    d="M 0 120 Q 50 100 100 80 T 200 60 T 300 40 T 400 20"
                                    fill="none"
                                    stroke="var(--color-chart-1)"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                {[40, 80, 120].map((y) => (
                                    <line
                                        key={y}
                                        x1="0"
                                        y1={y}
                                        x2="400"
                                        y2={y}
                                        stroke="currentColor"
                                        strokeOpacity="0.08"
                                        strokeDasharray="6 4"
                                    />
                                ))}
                            </svg>
                        </div>
                        <div className="mt-4 flex justify-between border-t border-border/40 pt-4 dark:border-border/40">
                            {['Jan', 'Mar', 'Jun', 'Sep', 'Dec'].map((month) => (
                                <span
                                    key={month}
                                    className="text-xs font-medium text-muted-foreground"
                                >
                                    {month}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </ModernPageLayout>
        </AppLayout>
    );
}
