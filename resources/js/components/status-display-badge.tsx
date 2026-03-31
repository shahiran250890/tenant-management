type StatusDisplayBadgeProps = {
    label: string;
    tone: 'success' | 'error' | 'warning' | 'neutral';
};

function toneClassName(tone: StatusDisplayBadgeProps['tone']): string {
    if (tone === 'success') {
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
    }

    if (tone === 'error') {
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    }

    if (tone === 'warning') {
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    }

    return 'bg-muted text-muted-foreground';
}

export default function StatusDisplayBadge({ label, tone }: StatusDisplayBadgeProps) {
    return (
        <span className={`inline-block rounded-md px-2 py-0.5 font-bold ${toneClassName(tone)}`}>
            {label}
        </span>
    );
}
