<?php

use App\Models\Application;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioningService;
use Database\Seeders\ApplicationSeeder;
use Database\Seeders\RolePermissionSeeder;
use Tests\TestCase;

beforeEach(function () {
    /** @var TestCase $this */
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ApplicationSeeder::class);
});

test('store creates tenant and calls provisioning service', function () {
    /** @var TestCase $this */
    $provisionCalled = false;
    $this->mock(TenantProvisioningService::class, function ($mock) use (&$provisionCalled) {
        $mock->shouldReceive('provision')
            ->once()
            ->with(\Mockery::on(fn ($arg) => $arg instanceof Tenant && $arg->name === 'New Corp'))
            ->andReturnUsing(function () use (&$provisionCalled) {
                $provisionCalled = true;
            });
    });

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
    expect($provisionCalled)->toBeTrue();

    $tenant = Tenant::with('application')->where('name', 'New Corp')->first();
    expect($tenant)->not->toBeNull();
    expect($tenant->application?->code)->toBe('vetmanagementsystem');
    expect($tenant->setup_status)->toBe('ready');
    expect($tenant->setup_stage)->toBe('complete');
    expect($tenant->setup_error)->toBeNull();
    expect($tenant->setup_completed_at)->not->toBeNull();
});

test('store marks tenant as failed when provisioning throws', function () {
    /** @var TestCase $this */
    $this->mock(TenantProvisioningService::class, function ($mock) {
        $mock->shouldReceive('provision')
            ->once()
            ->andThrow(new \RuntimeException('Database creation failed'));
    });

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

    $response->assertSessionHas('error');
    $response->assertRedirect(route('tenants.index', ['modal' => 'create']));

    $tenant = Tenant::where('name', 'Fail Corp')->first();
    expect($tenant)->not->toBeNull();
    expect($tenant->setup_status)->toBe('failed');
    expect($tenant->setup_stage)->toBe('database');
    expect($tenant->setup_error)->toContain('Database creation failed');
    expect($tenant->setup_failed_at)->not->toBeNull();
    expect($tenant->domains()->pluck('domain')->all())->toEqual(['failcorp.test']);
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
