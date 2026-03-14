import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ModernPageLayoutProps = {
    /** Main content */
    children: ReactNode;
    /** Page title (e.g. "Users", "Dashboard") */
    title?: string;
    /** Short description or subtitle below the title */
    description?: string;
    /** Optional actions slot (e.g. primary button, filters) — aligned right on desktop */
    actions?: ReactNode;
    /** Extra class for the outer wrapper */
    className?: string;
    /** Extra class for the content area below the header */
    contentClassName?: string;
    /** Spacing: default = comfortable padding; compact = tighter */
    variant?: 'default' | 'compact';
    /** Remove horizontal/vertical padding from content (e.g. for full-bleed tables) */
    noPadding?: boolean;
};

export function ModernPageLayout({
    children,
    title,
    description,
    actions,
    className,
    contentClassName,
    variant = 'default',
    noPadding = false,
}: ModernPageLayoutProps) {
    const padding = noPadding
        ? ''
        : variant === 'compact'
          ? 'p-3 md:p-4'
          : 'p-4 md:p-6';
    const gap = variant === 'compact' ? 'gap-4' : 'gap-6';

    return (
        <div
            className={cn(
                'flex h-full flex-1 flex-col overflow-x-auto',
                padding,
                gap,
                className,
            )}
        >
            {(title ?? description ?? actions) && (
                <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-0.5">
                        {title && (
                            <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                                {title}
                            </h1>
                        )}
                        {description && (
                            <p className="text-sm text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                    {actions && (
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {actions}
                        </div>
                    )}
                </header>
            )}
            <div className={cn('flex flex-1 flex-col min-h-0', contentClassName)}>
                {children}
            </div>
        </div>
    );
}
