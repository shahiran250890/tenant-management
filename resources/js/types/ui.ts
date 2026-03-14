import type { ReactNode } from 'react';
import type { BreadcrumbItem } from '@/types/navigation';

export type AppLayoutProps = {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
};

export type AuthLayoutProps = {
    children?: ReactNode;
    name?: string;
    title?: string;
    description?: string;
};

export type { ModernPageLayoutProps } from '@/components/modern-page-layout';
export type { ModernDialogLayoutProps } from '@/components/modern-dialog-layout';
