<?php

namespace App\Http\Controllers\Tenant;

use App\Concerns\HasResourcePermission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tenants\TenantRequest;
use App\Jobs\EnsureTenantUserJob;
use App\Jobs\RetryTenantMigrationSetup;
use App\Jobs\RunTenantFakeDataSeeder;
use App\Jobs\TenantMigrationSetup;
use App\Models\Application;
use App\Models\Module;
use App\Models\Tenant;
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
            $validated['setup_status'] = 'provisioning';
            $validated['setup_stage'] = 'database';
            $validated['setup_error'] = null;
            $validated['setup_failed_at'] = null;
            $validated['setup_completed_at'] = null;
            $tenant = Tenant::create($validated);
            foreach ($hosts as $host) {
                if ($host !== '') {
                    $tenant->domains()->create(['domain' => $host]);
                }
            }
            TenantMigrationSetup::dispatch($tenant->id)
                ->onQueue('initial_tenant_migration_setup')
                ->delay(now()->addSeconds(5));
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

    public function createTenantUser(Tenant $tenant): RedirectResponse
    {
        $this->authorize('update tenant');

        try {
            EnsureTenantUserJob::dispatch($tenant->id)
                ->onQueue('ensure_tenant_user')
                ->delay(now()->addSeconds(5));

            return redirect()
                ->route('tenants.index')
                ->with('success', 'Create tenant user has been queued for '.$tenant->name.'. It will run shortly.')
                ->with('success_key', now()->timestamp);
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('tenants.index')
                ->with('error', 'Failed to queue create tenant user: '.$e->getMessage())
                ->with('error_key', now()->timestamp);
        }
    }

    /**
     * Run the application's tenant migrations for this tenant (e.g. after new migrations are added).
     * Use this for existing tenants so their schema stays in sync with the latest migrations.
     */
    public function runTenantMigrations(Tenant $tenant): RedirectResponse
    {
        $this->authorize('update tenant');

        try {
            $tenant->update([
                'setup_status' => 'provisioning',
                'setup_stage' => 'migration',
                'setup_error' => null,
                'setup_failed_at' => null,
                'setup_completed_at' => null,
            ]);
            RetryTenantMigrationSetup::dispatch($tenant->id)
                ->onQueue('retry_tenant_migration_setup')
                ->delay(now()->addSeconds(5));

            return redirect()
                ->route('tenants.index')
                ->with('success', 'Tenant migrations have been queued for '.$tenant->name.'. They will run shortly.')
                ->with('success_key', now()->timestamp);
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('tenants.index')
                ->with('error', 'Failed to queue tenant migrations: '.$e->getMessage())
                ->with('error_key', now()->timestamp);
        }
    }

    /**
     * Run fake-data seeders for tenant data generation (excluding user seeder).
     */
    public function runTenantFakeDataSeeders(Tenant $tenant): RedirectResponse
    {
        $this->authorize('update tenant');

        try {
            RunTenantFakeDataSeeder::dispatch($tenant->id)
                ->delay(now()->addSeconds(5));

            return redirect()
                ->route('tenants.index')
                ->with('success', 'Run fake data has been queued for '.$tenant->name.'. It will run shortly.')
                ->with('success_key', now()->timestamp);
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('tenants.index')
                ->with('error', 'Failed to queue fake data seeding: '.$e->getMessage())
                ->with('error_key', now()->timestamp);
        }
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
