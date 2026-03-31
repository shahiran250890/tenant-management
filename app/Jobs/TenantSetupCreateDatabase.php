<?php

namespace App\Jobs;

use App\Models\Tenant;
use App\Services\TenantProvisioningService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class TenantSetupCreateDatabase implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $tenantId)
    {
        $this->onQueue('tenant_migration_setup');
    }

    public function handle(TenantProvisioningService $provisioningService): void
    {
        $tenant = Tenant::query()->find($this->tenantId);

        if (! $tenant instanceof Tenant) {
            return;
        }

        $tenant->update([
            'setup_status' => 'provisioning',
            'setup_stage' => 'database',
            'setup_error' => null,
            'setup_failed_at' => null,
            'setup_completed_at' => null,
        ]);

        $provisioningService->createDatabase($tenant);
    }

    public function failed(Throwable $exception): void
    {
        $tenant = Tenant::query()->find($this->tenantId);

        if (! $tenant instanceof Tenant) {
            return;
        }

        $tenant->update([
            'setup_status' => 'failed',
            'setup_stage' => 'database',
            'setup_error' => $exception->getMessage(),
            'setup_failed_at' => now(),
            'setup_completed_at' => null,
        ]);
    }
}
