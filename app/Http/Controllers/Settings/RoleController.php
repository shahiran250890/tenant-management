<?php

namespace App\Http\Controllers\Settings;

use App\Concerns\HasResourcePermission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\RoleRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    use HasResourcePermission;

    public function __construct()
    {
        $this->registerResourcePermissionMiddleware();
    }

    protected function resourcePermissionName(): string
    {
        return 'role';
    }

    public function index(Request $request): Response
    {
        $roles = Role::with('permissions')->orderBy('name')->get();
        $allPermissions = Permission::orderBy('name')->get();

        return Inertia::render('settings/system/roles/index', [
            'roles' => $roles,
            'permissions' => $allPermissions,
            ...$this->resourcePermissionProps(),
            'openModal' => $request->query('modal'),
            'openModalRoleId' => $request->query('role_id') ? (int) $request->query('role_id') : null,
        ]);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('settings.system.roles.index', ['modal' => 'create']);
    }

    public function store(RoleRequest $request): RedirectResponse
    {
        $guard = config('auth.defaults.guard', 'web');

        try {
            $role = Role::create([
                'name' => $request->validated('name'),
                'guard_name' => $guard,
            ]);
            $role->syncPermissions($request->validated('permissions', []));
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('settings.system.roles.index', ['modal' => 'create'])
                ->with('error', 'Failed to create role. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('settings.system.roles.index')
            ->with('success', 'Role created successfully.')
            ->with('success_key', now()->timestamp);
    }

    public function show(Role $role): RedirectResponse
    {
        return redirect()->route('settings.system.roles.index', ['modal' => 'view', 'role_id' => $role->id]);
    }

    public function edit(Role $role): RedirectResponse
    {
        return redirect()->route('settings.system.roles.index', ['modal' => 'edit', 'role_id' => $role->id]);
    }

    public function update(RoleRequest $request, Role $role): RedirectResponse
    {
        try {
            $role->update(['name' => $request->validated('name')]);
            $role->syncPermissions($request->validated('permissions', []));
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('settings.system.roles.index', ['modal' => 'edit', 'role_id' => $role->id])
                ->with('error', 'Failed to update role. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('settings.system.roles.index')
            ->with('success', 'Role updated successfully.')
            ->with('success_key', now()->timestamp);
    }

    public function destroy(Role $role): RedirectResponse
    {
        abort_unless(auth()->user()->can('delete role'), 403);

        try {
            $role->delete();
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('settings.system.roles.index')
                ->with('error', 'Failed to delete role. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('settings.system.roles.index')
            ->with('success', 'Role deleted successfully.')
            ->with('success_key', now()->timestamp);
    }
}
