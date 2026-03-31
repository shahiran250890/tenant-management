<?php

use App\Jobs\TenantMigrationSetup;
use App\Jobs\TenantSetupCreateDatabase;
use App\Jobs\TenantSetupRunMigrations;
use App\Jobs\TenantSetupRunSeeders;
use App\Models\Application;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\ApplicationSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

beforeEach(function () {
    /** @var TestCase $this */
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ApplicationSeeder::class);
});

test('store creates tenant and dispatches tenant migration setup job', function () {
    /** @var TestCase $this */
    Bus::fake();

    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'create tenant');
    $this->actingAs($user);

    $applicationId = Application::where('code', 'vetmanagementsystem')->first()->id;

    $response = $this->post(route('tenants.store'), [
        'name' => 'New Corp',
        'hosts' => ['newcorp.test'],
        'storage_domain' => 'newcorp-storage',
        'application_id' => $applicationId,
        'is_enabled' => true,
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('tenants.index'));

    $tenant = Tenant::with('application')->where('name', 'New Corp')->first();
    expect($tenant)->not->toBeNull();
    expect($tenant->application?->code)->toBe('vetmanagementsystem');
    expect($tenant->setup_status)->toBe('provisioning');
    expect($tenant->setup_stage)->toBe('database');
    expect($tenant->setup_error)->toBeNull();
    expect($tenant->setup_completed_at)->toBeNull();
    Bus::assertDispatched(TenantMigrationSetup::class, function (TenantMigrationSetup $job) use ($tenant) {
        return $job->tenantId === $tenant->id;
    });
});

test('store still dispatches setup job when provision would fail later', function () {
    /** @var TestCase $this */
    Bus::fake();

    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'create tenant');
    $this->actingAs($user);

    $applicationId = Application::where('code', 'vetmanagementsystem')->first()->id;

    $response = $this->post(route('tenants.store'), [
        'name' => 'Fail Corp',
        'hosts' => ['failcorp.test'],
        'storage_domain' => 'fail-storage',
        'application_id' => $applicationId,
        'is_enabled' => true,
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('tenants.index'));

    $tenant = Tenant::where('name', 'Fail Corp')->first();
    expect($tenant)->not->toBeNull();
    expect($tenant->setup_status)->toBe('provisioning');
    expect($tenant->setup_stage)->toBe('database');
    expect($tenant->setup_error)->toBeNull();
    expect($tenant->setup_failed_at)->toBeNull();
    expect($tenant->domains()->pluck('domain')->all())->toEqual(['failcorp.test']);
    Bus::assertDispatched(TenantMigrationSetup::class, function (TenantMigrationSetup $job) use ($tenant) {
        return $job->tenantId === $tenant->id;
    });
});

test('application_id is required when storing a tenant', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'create tenant');
    $this->actingAs($user);

    $response = $this->post(route('tenants.store'), [
        'name' => 'No App Tenant',
        'hosts' => [],
        'storage_domain' => 'storage',
        'application_id' => '',
        'is_enabled' => true,
    ]);

    $response->assertSessionHasErrors('application_id');
});

test('tenant migration setup job dispatches setup chain in sequence', function () {
    /** @var TestCase $this */
    Bus::fake();

    $tenant = Tenant::query()->create([
        'name' => 'Chain Corp',
        'database_name' => 'chain_corp_db',
        'database_username' => 'root',
        'database_password' => '',
        'database_host' => '127.0.0.1',
        'database_port' => 3306,
        'application_id' => Application::where('code', 'vetmanagementsystem')->first()->id,
        'is_enabled' => true,
        'setup_status' => 'provisioning',
        'setup_stage' => 'database',
    ]);

    $job = new TenantMigrationSetup($tenant->id);
    $job->handle();

    Bus::assertChained([
        new TenantSetupCreateDatabase($tenant->id),
        new TenantSetupRunMigrations($tenant->id),
        new TenantSetupRunSeeders($tenant->id),
    ]);
});
