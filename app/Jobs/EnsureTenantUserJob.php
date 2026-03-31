<?php

namespace App\Jobs;

use App\Models\Tenant;
use App\Services\TenantProvisioningService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class EnsureTenantUserJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $tenantId)
    {
        $this->onQueue('ensure_tenant_user');
    }

    public function handle(TenantProvisioningService $provisioningService): void
    {
        $tenant = Tenant::query()->find($this->tenantId);

        if (! $tenant instanceof Tenant) {
            return;
        }

        try {
            $provisioningService->ensureTenantUser($tenant);
        } catch (\Throwable $exception) {
            report($exception);

            throw $exception;
        }
    }
}
