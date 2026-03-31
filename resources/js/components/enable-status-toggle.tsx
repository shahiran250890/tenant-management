/**
 * Reusable enable/disable status toggle: shows Enabled (green) / Disabled (red) and toggles
 * is_enabled via PATCH to a given URL with axios, then SweetAlert and optional callback.
 * Use on any screen (tenants, modules, etc.) by passing toggleUrl and optional titles.
 */
import { router } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import Swal from 'sweetalert2';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

/** Read Laravel XSRF-TOKEN from cookie for axios PATCH requests. */
function getCsrfToken(): string {
    const match = document.cookie.match(/\bXSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1].trim()) : '';
}

export type EnableStatusToggleProps = {
    /** Full URL for PATCH request (e.g. /tenants/123/enabled). Body: { is_enabled: boolean }. */
    toggleUrl: string;
    isEnabled: boolean;
    /** When false, renders read-only span (no click). */
    canUpdate: boolean;
    /** Called after successful toggle. Defaults to router.reload. */
    onToggled?: () => void;
    /** SweetAlert title when toggled to enabled. */
    enabledTitle?: string;
    /** SweetAlert title when toggled to disabled. */
    disabledTitle?: string;
    /** Optional aria-label for the button (e.g. "Toggle tenant status"). */
    ariaLabel?: string;
};

export default function EnableStatusToggle({
    toggleUrl,
    isEnabled,
    canUpdate,
    onToggled,
    enabledTitle = 'Enabled',
    disabledTitle = 'Disabled',
    ariaLabel,
}: EnableStatusToggleProps) {
    const [toggling, setToggling] = useState(false);

    /** PATCH toggleUrl with { is_enabled }, show SweetAlert, then onToggled or router.reload. */
    async function handleClick(): Promise<void> {
        if (!canUpdate || toggling) return;
        const newValue = !isEnabled;
        setToggling(true);
        try {
            await axios.patch(toggleUrl, { is_enabled: newValue }, {
                withCredentials: true,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
            });
            await Swal.fire({
                title: newValue ? enabledTitle : disabledTitle,
                icon: newValue ? 'success' : 'info',
                iconColor: newValue ? '#16a34a' : '#6b7280',
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false,
                background: newValue ? undefined : '#f8fafc',
                color: newValue ? undefined : '#475569',
            });
            if (onToggled) {
                onToggled();
            } else {
                router.reload();
            }
} finally {
        setToggling(false);
        }
    }

    // Label and button styling: bold text, grey background; green when enabled, red when disabled, muted while loading.
    const label = isEnabled ? 'Enabled' : 'Disabled';
    const buttonClassName = toggling
        ? 'text-muted-foreground bg-muted'
        : isEnabled
          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60'
          : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60';

    // Clickable button with spinner when loading; read-only span when canUpdate is false.
    const tooltipText =
        ariaLabel ?? (isEnabled ? 'Disable (click to toggle)' : 'Enable (click to toggle)');
    if (canUpdate) {
        return (
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`h-auto rounded-md px-2 py-1 font-bold ${buttonClassName}`}
                disabled={toggling}
                onClick={handleClick}
                title={tooltipText}
                aria-label={tooltipText}
                aria-busy={toggling}
            >
                {toggling ? (
                    <Spinner className="size-4 shrink-0" />
                ) : (
                    label
                )}
            </Button>
        );
    }

    // Read-only: same bold text, grey background, green/red color.
    return (
        <span
            className={`inline-block rounded-md px-2 py-0.5 font-bold ${
                isEnabled
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
            }`}
        >
            {label}
        </span>
    );
}
