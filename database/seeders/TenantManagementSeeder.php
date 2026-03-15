<?php

namespace Database\Seeders;

use App\Models\Domain;
use App\Models\Tenant;
use App\Models\TenantDetail;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TenantManagementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tenant = new Tenant;
        $tenant->forceFill([
            'id' => Str::uuid()->toString(),
            'subscription_plan_id' => null,
            'name' => 'Test Tenant',
            'storage_domain' => 'vetmanagementsystem',
            'database_name' => 'vetmanagementsystem',
            'database_username' => 'root',
            'database_password' => '',
            'database_host' => '127.0.0.1',
            'database_port' => 3306,
            'is_enabled' => true,
        ])->save();

        $tenantDetail = new TenantDetail;
        $tenantDetail->forceFill([
            'tenant_id' => $tenant->id,
            'email' => 'tenant@example.com',
            'phone' => '0123456789',
            'address' => '123 Test Street',
            'city' => 'Kuala Lumpur',
            'state' => 'Wilayah Persekutuan',
            'zip' => '50000',
            'country' => 'Malaysia',
            'postal_address' => '123 Test Street',
            'postal_city' => 'Kuala Lumpur',
            'postal_state' => 'Wilayah Persekutuan',
            'postal_zip' => '50000',
            'postal_country' => 'Malaysia',
        ])->save();

        $domain = new Domain;
        $domain->forceFill([
            'tenant_id' => $tenant->id,
            'domain' => 'vetmanagementsystem.test',
        ])->save();
    }
}
