import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props as { name?: string };

    return (
        <div className="relative grid min-h-dvh w-full grid-cols-1 lg:grid-cols-2">
            {/* Left: brand panel */}
            <div className="relative hidden overflow-hidden lg:block">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
                <div className="relative flex h-full flex-col p-10">
                    <Link
                        href={home()}
                        className="flex items-center gap-3 text-white transition-opacity hover:opacity-90"
                    >
                        <AppLogoIcon className="size-9 shrink-0 fill-current" />
                        <span className="text-lg font-semibold tracking-tight">
                            {name ?? 'App'}
                        </span>
                    </Link>
                    <div className="mt-auto">
                        <p className="max-w-xs text-sm leading-relaxed text-slate-400">
                            Tenant Management — sign in to manage your
                            organisation and users.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right: form panel */}
            <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-10 lg:px-14">
                <Link
                    href={home()}
                    className="mb-8 flex items-center lg:mb-12 lg:hidden"
                >
                    <AppLogoIcon className="size-8 fill-current text-foreground" />
                </Link>
                <div className="w-full max-w-[380px]">
                    <div className="mb-8">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                            {title}
                        </h1>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card/50 p-6 shadow-sm backdrop-blur sm:p-8">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
