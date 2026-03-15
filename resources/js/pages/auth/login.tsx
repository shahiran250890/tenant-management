/**
 * Login page – email/password sign-in via Fortify.
 * When redirected with account_disabled=1 (session terminated for disabled user),
 * shows a SweetAlert then cleans the URL.
 */
import { Form, Head, router } from '@inertiajs/react';
import { useEffect } from 'react';
import Swal from 'sweetalert2';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { login } from '@/routes';

/** Props from Fortify login view (status, canResetPassword, accountDisabled from query). */
type Props = {
    status?: string;
    canResetPassword: boolean;
    accountDisabled?: boolean;
};

export default function Login({
    status,
    canResetPassword,
    accountDisabled = false,
}: Props) {
    // When session was terminated because account is disabled: show SweetAlert, then replace URL.
    useEffect(() => {
        if (accountDisabled) {
            Swal.fire({
                title: 'Account disabled',
                text: 'Your account has been disabled. Your session has been terminated.',
                icon: 'warning',
                confirmButtonText: 'OK',
            }).then(() => {
                router.visit(login(), { replace: true });
            });
        }
    }, [accountDisabled]);

    return (
        <AuthLayout
            title="Welcome back"
            description="Enter your credentials to access your account"
        >
            <Head title="Log in" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        {/* Success message (e.g. after password reset). */}
                        {status && (
                            <div className="rounded-lg bg-emerald-500/10 px-3 py-2.5 text-center text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                {status}
                            </div>
                        )}
                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="email"
                                    className="text-sm font-medium"
                                >
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    className="h-11 bg-background"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label
                                        htmlFor="password"
                                        className="text-sm font-medium"
                                    >
                                        Password
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-xs text-muted-foreground hover:text-foreground"
                                            tabIndex={5}
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="h-11 bg-background"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center gap-2.5">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="size-4 rounded border-2"
                                />
                                <Label
                                    htmlFor="remember"
                                    className="cursor-pointer text-sm font-normal text-muted-foreground"
                                >
                                    Keep me signed in
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="mt-1 h-11 w-full font-medium"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing ? (
                                    <Spinner className="size-4" />
                                ) : (
                                    'Sign in'
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
