<?php

namespace App\Http\Controllers\Tenant;

use App\Concerns\HasResourcePermission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tenants\TenantRequest;
use App\Models\Application;
use App\Models\Module;
use App\Models\Tenant;
use App\Services\TenantProvisioningService;
use Illuminate\Http\JsonResponse;
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
        $tenants = Tenant::with(['domains', 'modules', 'application'])->orderBy('name')->get();
        $modules = Module::where('is_enabled', true)->orderBy('name')->get();
        $applications = Application::where('is_enabled', true)->orderBy('name')->get();

        return Inertia::render('tenants/index', [
            'tenants' => $tenants,
            'modules' => $modules,
            'applications' => $applications,
            ...$this->resourcePermissionProps(),
            'openModal' => $request->query('modal'),
            'openModalTenantId' => $request->query('tenant_id'),
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
            'hosts',
            'storage_domain',
            'application_id',
            'is_enabled',
        ]);
        $hosts = $validated['hosts'] ?? [];
        unset($validated['hosts']);
        $hosts = array_values(array_filter(array_map('strval', $hosts)));
        try {
            $validated['database_name'] = str_replace(' ', '', $validated['name']).'_'.Str::random(10);
            $validated['database_username'] = 'root';
            $validated['database_password'] = '';
            $validated['database_host'] = '127.0.0.1';
            $validated['database_port'] = 3306;
            $tenant = Tenant::create($validated);
            foreach ($hosts as $host) {
                if ($host !== '') {
                    $tenant->domains()->create(['domain' => $host]);
                }
            }

            try {
                app(TenantProvisioningService::class)->provision($tenant);
            } catch (\Throwable $provisioningException) {
                $tenant->domains()->delete();
                $tenant->delete();
                report($provisioningException);

                $message = 'Provisioning failed (database or migrations), tenant was rolled back: '
                    .$provisioningException->getMessage()
                    .' Check storage/logs/laravel.log for full details.';

                return redirect()
                    ->route('tenants.index', ['modal' => 'create'])
                    ->with('error', $message)
                    ->with('error_key', now()->timestamp);
            }
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

    public function show(Tenant $tenant): RedirectResponse
    {
        return redirect()->route('tenants.index', ['modal' => 'view', 'tenant_id' => $tenant->id]);
    }

    public function edit(Tenant $tenant): RedirectResponse
    {
        return redirect()->route('tenants.index', ['modal' => 'edit', 'tenant_id' => $tenant->id]);
    }

    public function updateEnabled(Request $request, Tenant $tenant): JsonResponse
    {
        $this->authorize('update tenant');

        $validated = $request->validate([
            'is_enabled' => ['required', 'boolean'],
        ]);

        $tenant->update(['is_enabled' => $validated['is_enabled']]);

        return response()->json(['is_enabled' => $tenant->is_enabled]);
    }

    public function update(TenantRequest $request, Tenant $tenant): RedirectResponse
    {
        $validated = $request->safe()->only([
            'name',
            'hosts',
            'storage_domain',
            'application_id',
            'is_enabled',
        ]);
        $hosts = $validated['hosts'] ?? [];
        unset($validated['hosts']);
        $hosts = array_values(array_filter(array_map('strval', $hosts)));

        try {
            $tenant->update($validated);

            // Sync domains: keep only domains in the submitted list; add new; remove missing.
            $existing = $tenant->domains()->pluck('domain')->all();
            foreach (array_diff($existing, $hosts) as $domain) {
                $tenant->domains()->where('domain', $domain)->delete();
            }
            foreach (array_diff($hosts, $existing) as $host) {
                if ($host !== '') {
                    $tenant->domains()->create(['domain' => $host]);
                }
            }
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
