import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type FlashMessageDialogProps = {
    /** Whether the dialog is open. */
    open: boolean;
    /** 'success' shows green check; 'error' shows red alert. */
    variant: 'success' | 'error';
    /** Main message body. */
    message: string;
    /** Called when the dialog should close (overlay click, escape, or auto-close). */
    onClose: () => void;
    /** Auto-close after this many ms. Omit or 0 to disable. */
    autoCloseMs?: number;
    /** Dialog title. Defaults to "Success" or "Error" based on variant. */
    title?: string;
};

export default function FlashMessageDialog({
    open,
    variant,
    message,
    onClose,
    autoCloseMs = 2000,
    title,
}: FlashMessageDialogProps) {
    useEffect(() => {
        if (!open || !autoCloseMs) return;
        const timer = window.setTimeout(onClose, autoCloseMs);
        return () => window.clearTimeout(timer);
    }, [open, autoCloseMs, onClose]);

    const isSuccess = variant === 'success';
    const displayTitle = title ?? (isSuccess ? 'Success' : 'Error');

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-md" showCloseButton={false}>
                <div className="flex flex-col items-center gap-4 py-2 text-center">
                    {isSuccess ? (
                        <>
                            <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                <CheckCircle2 className="size-7 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="space-y-1">
                                <DialogHeader>
                                    <DialogTitle>{displayTitle}</DialogTitle>
                                </DialogHeader>
                                <p className="text-sm text-muted-foreground">{message}</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 dark:bg-destructive/20">
                                <AlertCircle className="size-7 text-destructive" />
                            </div>
                            <div className="space-y-1">
                                <DialogHeader>
                                    <DialogTitle>{displayTitle}</DialogTitle>
                                </DialogHeader>
                                <p className="text-sm text-muted-foreground">{message}</p>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
