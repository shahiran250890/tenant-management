import { formatDateTime as format } from '@/lib/format-date-time';
import { cn } from '@/lib/utils';

type Props = {
    /** ISO date string, or null/undefined for empty state (renders —). */
    value: string | null | undefined;
    className?: string;
};

/**
 * Renders a date/time in the app’s standard format (medium date, short time).
 * Use this component so all dates stay consistent.
 */
export function FormatDateTime({ value, className }: Props) {
    return (
        <span className={cn(className)}>{format(value)}</span>
    );
}
