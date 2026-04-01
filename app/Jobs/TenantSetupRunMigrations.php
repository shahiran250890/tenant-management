<?php

namespace App\Jobs;

use App\Models\Tenant;
use App\Services\TenantSetupApiClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class TenantSetupRunMigrations implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $tenantId)
    {
        $this->onQueue('tenant_migration_setup');
    }

    public function handle(TenantSetupApiClient $apiClient): void
    {
        $tenant = Tenant::query()->find($this->tenantId);

        if (! $tenant instanceof Tenant) {
            return;
        }

        $tenant->update([
            'setup_status' => 'provisioning',
            'setup_stage' => 'migration',
            'setup_error' => null,
            'setup_failed_at' => null,
            'setup_completed_at' => null,
        ]);

        $apiClient->runMigrations($tenant);
    }

    public function failed(Throwable $exception): void
    {
        $tenant = Tenant::query()->find($this->tenantId);

        if (! $tenant instanceof Tenant) {
            return;
        }

        $tenant->update([
            'setup_status' => 'failed',
            'setup_stage' => 'migration',
            'setup_error' => $exception->getMessage(),
            'setup_failed_at' => now(),
            'setup_completed_at' => null,
        ]);
    }
}
