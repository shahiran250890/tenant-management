<?php

namespace App\Jobs;

use App\Models\Tenant;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Bus;

class TenantMigrationSetup implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $tenantId)
    {
        $this->onQueue('tenant_migration_setup');
    }

    public function handle(): void
    {
        $tenant = Tenant::query()->find($this->tenantId);

        if (! $tenant instanceof Tenant) {
            return;
        }

        Bus::chain([
            new TenantSetupCreateDatabase($tenant->id),
            new TenantSetupRunMigrations($tenant->id),
            new TenantSetupRunSeeders($tenant->id),
        ])->onQueue('tenant_migration_setup')->dispatch();
    }
}
