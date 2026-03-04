import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';

type StatusToggleProps = {
    /** Label shown above the toggle (e.g. "Status"). */
    label?: ReactNode;
    /** When true, label shows required asterisk (uses Label's required prop). */
    required?: boolean;
    /** Text shown when checked (e.g. "Active"). */
    activeLabel: string;
    /** Text shown when unchecked (e.g. "Inactive"). */
    inactiveLabel: string;
    /** Name for the hidden input (form submission). */
    name: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    /** Validation error message. */
    error?: string;
};

export default function StatusToggle({
    label,
    required,
    activeLabel,
    inactiveLabel,
    name,
    checked,
    onCheckedChange,
    error,
}: StatusToggleProps) {
    return (
        <div className="flex flex-col gap-1.5">
            {label != null ? <Label required={required}>{label}</Label> : null}
            <input type="hidden" name={name} value={checked ? '1' : '0'} />
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onCheckedChange(!checked)}
                className={`relative inline-flex h-10 w-full max-w-[200px] cursor-pointer items-center rounded-full border border-input bg-muted/50 pr-2 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    checked
                        ? 'pl-4 bg-primary/15 dark:bg-primary/20'
                        : 'pl-12'
                }`}
            >
                <span className="text-sm font-medium">
                    {checked ? activeLabel : inactiveLabel}
                </span>
                <span
                    className={`absolute top-1 size-8 rounded-full bg-background shadow-md transition-[left] ${
                        checked ? 'left-[calc(100%-2.25rem)]' : 'left-1'
                    }`}
                    aria-hidden
                />
            </button>
            <InputError message={error} />
        </div>
    );
}
