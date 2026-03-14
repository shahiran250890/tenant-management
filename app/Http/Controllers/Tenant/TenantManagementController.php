<?php

namespace App\Http\Controllers\Tenant;

use App\Concerns\HasResourcePermission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tenants\TenantRequest;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TenantManagementController extends Controller
{
    use HasResourcePermission;

    public function __construct()
    {
        $this->registerResourcePermissionMiddleware();
    }

    protected function resourcePermissionName(): string
    {
        return 'tenant';
    }

    public function index(Request $request): Response
    {
        $tenants = Tenant::all();

        return Inertia::render('tenants/index', [
            'tenants' => $tenants,
            ...$this->resourcePermissionProps(),
            'openModal' => $request->query('modal'),
            'openModalTenantId' => $request->query('tenant_id') ? (int) $request->query('tenant_id') : null,
        ]);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('tenants.index', ['modal' => 'create']);
    }

    public function store(TenantRequest $request): RedirectResponse
    {
        $validated = $request->safe()->only([
            'name',
            'host',
            'storage_domain',
            'is_active',
        ]);
        try {
            $validated['database_name'] = $validated['name'].'_'.Str::random(10);
            $validated['database_username'] = 'root';
            $validated['database_password'] = '';
            $validated['database_host'] = '127.0.0.1';
            $validated['database_port'] = 3306;
            Tenant::create($validated);
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('tenants.index', ['modal' => 'create'])
                ->with('error', 'Failed to create tenant. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('tenants.index')
            ->with('success', 'Tenant created successfully.')
            ->with('success_key', now()->timestamp);
    }

    public function show(Tenant $tenant): Response
    {
        return Inertia::render('tenants/show', [
            'tenant' => $tenant,
        ]);
    }

    public function edit(Tenant $tenant): RedirectResponse
    {
        return redirect()->route('tenants.index', ['modal' => 'edit', 'tenant_id' => $tenant->id]);
    }

    public function update(TenantRequest $request, Tenant $tenant): RedirectResponse
    {
        $validated = $request->safe()->only([
            'name',
            'host',
            'storage_domain',
            'is_active',
        ]);

        try {
            $tenant->update($validated);
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('tenants.index', ['modal' => 'edit', 'tenant_id' => $tenant->id])
                ->with('error', 'Failed to update tenant. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('tenants.index')
            ->with('success', 'Tenant updated successfully.')
            ->with('success_key', now()->timestamp);
    }

    public function destroy(Tenant $tenant): RedirectResponse
    {
        try {
            $tenant->delete();
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('tenants.index')
                ->with('error', 'Failed to delete tenant. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('tenants.index')
            ->with('success', 'Tenant deleted successfully.')
            ->with('success_key', now()->timestamp);
    }
}
