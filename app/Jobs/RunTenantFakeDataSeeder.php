<?php

namespace App\Jobs;

use App\Models\Tenant;
use App\Services\TenantSetupApiClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class RunTenantFakeDataSeeder implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $tenantId)
    {
        $this->onQueue('tenant_fake_data_seeding');
    }

    public function handle(TenantSetupApiClient $apiClient): void
    {
        $tenant = Tenant::query()->find($this->tenantId);

        if (! $tenant instanceof Tenant) {
            return;
        }

        $apiClient->runFakeDataSeeders($tenant);
    }
}
