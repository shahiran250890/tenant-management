import type { ReactNode } from 'react';
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type ModernDialogLayoutProps = {
    /** Dialog title (required for accessibility) */
    title: ReactNode;
    /** Optional short description or subtitle below the title */
    description?: ReactNode;
    /** Main content (form, list, message, etc.) */
    children?: ReactNode;
    /** Footer actions (e.g. primary + cancel buttons) */
    footer?: ReactNode;
    /** Extra class for the content area (between header and footer) */
    contentClassName?: string;
    /** Extra class for the root wrapper */
    className?: string;
};

/**
 * Reusable layout for modern dialogs. Use inside DialogContent.
 * Provides consistent header (title + optional description), body, and footer with spacing and separator.
 */
export function ModernDialogLayout({
    title,
    description,
    children,
    footer,
    contentClassName,
    className,
}: ModernDialogLayoutProps) {
    return (
        <div className={cn('flex flex-col gap-6', className)}>
            <DialogHeader className="gap-1.5 space-y-0 text-left">
                <DialogTitle className="text-xl font-semibold tracking-tight">
                    {title}
                </DialogTitle>
                {description != null && (
                    <DialogDescription className="text-sm text-muted-foreground">
                        {description}
                    </DialogDescription>
                )}
            </DialogHeader>

            {(children != null && children !== '') && (
                <div className={cn('min-w-0 flex-1', contentClassName)}>
                    {children}
                </div>
            )}

            {footer != null && (
                <DialogFooter className="flex flex-row flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4 dark:border-border/60 sm:flex-row">
                    {footer}
                </DialogFooter>
            )}
        </div>
    );
}
