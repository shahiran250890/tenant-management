<?php

namespace App\Http\Controllers\Settings;

use App\Concerns\HasResourcePermission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PermissionRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    use HasResourcePermission;

    public function __construct()
    {
        $this->registerResourcePermissionMiddleware();
    }

    protected function resourcePermissionName(): string
    {
        return 'permission';
    }

    public function index(Request $request): Response
    {
        $permissions = Permission::orderBy('name')->get();

        return Inertia::render('settings/permissions/index', [
            'permissions' => $permissions,
            ...$this->resourcePermissionProps(),
            'openModal' => $request->query('modal'),
            'openModalPermissionId' => $request->query('permission_id') ? (int) $request->query('permission_id') : null,
        ]);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('settings.permissions.index', ['modal' => 'create']);
    }

    public function store(PermissionRequest $request): RedirectResponse
    {
        $guard = config('auth.defaults.guard', 'web');

        try {
            Permission::create([
                'name' => $request->validated('name'),
                'guard_name' => $guard,
            ]);
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('settings.permissions.index', ['modal' => 'create'])
                ->with('error', 'Failed to create permission. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('settings.permissions.index')
            ->with('success', 'Permission created successfully.')
            ->with('success_key', now()->timestamp);
    }

    public function show(Permission $permission): RedirectResponse
    {
        return redirect()->route('settings.permissions.index', [
            'modal' => 'view',
            'permission_id' => $permission->id,
        ]);
    }

    public function edit(Permission $permission): RedirectResponse
    {
        return redirect()->route('settings.permissions.index', [
            'modal' => 'edit',
            'permission_id' => $permission->id,
        ]);
    }

    public function update(PermissionRequest $request, Permission $permission): RedirectResponse
    {
        try {
            $permission->update(['name' => $request->validated('name')]);
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('settings.permissions.index', [
                    'modal' => 'edit',
                    'permission_id' => $permission->id,
                ])
                ->with('error', 'Failed to update permission. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('settings.permissions.index')
            ->with('success', 'Permission updated successfully.')
            ->with('success_key', now()->timestamp);
    }

    public function destroy(Permission $permission): RedirectResponse
    {
        $this->authorizeResourcePermission('delete');

        try {
            $permission->delete();
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('settings.permissions.index')
                ->with('error', 'Failed to delete permission. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('settings.permissions.index')
            ->with('success', 'Permission deleted successfully.')
            ->with('success_key', now()->timestamp);
    }
}
