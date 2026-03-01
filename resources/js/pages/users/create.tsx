import { Form, Head, Link } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import usersRoutes from '@/routes/users';
import type { BreadcrumbItem } from '@/types';

type Props = {
    roles: string[];
};

export default function Create({ roles }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Users', href: usersRoutes.index.url() },
        { title: 'Add user', href: usersRoutes.create.url() },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add user" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border">
                    <h1 className="mb-6 text-lg font-semibold">Add user</h1>
                    <Form
                        {...usersRoutes.store.form()}
                        className="flex max-w-md flex-col gap-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Full name"
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoComplete="email"
                                        placeholder="email@example.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        name="password"
                                        required
                                        autoComplete="new-password"
                                        placeholder="Password"
                                    />
                                    <InputError message={errors.password} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation">
                                        Confirm password
                                    </Label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        name="password_confirmation"
                                        required
                                        autoComplete="new-password"
                                        placeholder="Confirm password"
                                    />
                                    <InputError message={errors.password_confirmation} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="role">Role</Label>
                                    <select
                                        id="role"
                                        name="role"
                                        className="border-input flex h-9 w-full max-w-xs rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="">No role</option>
                                        {roles.map((name) => (
                                            <option key={name} value={name}>
                                                {name.charAt(0).toUpperCase() + name.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.role} />
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Creating…' : 'Create user'}
                                    </Button>
                                    <Button type="button" variant="outline" asChild>
                                        <Link href={usersRoutes.index.url()}>
                                            Cancel
                                        </Link>
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </div>
        </AppLayout>
    );
}
