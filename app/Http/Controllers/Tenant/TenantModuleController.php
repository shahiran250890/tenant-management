<?php

namespace App\Http\Controllers\Tenant;

use App\Concerns\HasResourcePermission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tenants\TenantModuleRequest;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;

class TenantModuleController extends Controller
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

    public function update(TenantModuleRequest $request, Tenant $tenant): RedirectResponse
    {
        try {
            $tenant->modules()->sync($request->getSyncArray());
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('tenants.index', ['modal' => 'modules', 'tenant_id' => $tenant->id])
                ->with('error', 'Failed to update tenant modules. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('tenants.index', ['modal' => 'modules', 'tenant_id' => $tenant->id])
            ->with('success', 'Tenant modules updated successfully.')
            ->with('success_key', now()->timestamp);
    }
}
