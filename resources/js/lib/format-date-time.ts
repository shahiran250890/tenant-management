/**
 * Formats an ISO date string for display (medium date, short time).
 * Returns em dash when value is null or undefined.
 * Use this or the FormatDateTime component so all dates share the same format.
 */
export function formatDateTime(
    value: string | null | undefined,
): string {
    if (!value) return '—';
    const date = new Date(value);
    return Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}
