<?php

use App\Models\Application;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioningService;
use Database\Seeders\ApplicationSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Str;
use Tests\TestCase;

beforeEach(function () {
    /** @var TestCase $this */
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ApplicationSeeder::class);
});

function createTenant(array $overrides = []): Tenant
{
    $applicationId = Application::where('code', 'vetmanagementsystem')->first()?->id;

    return Tenant::create(array_merge([
        'name' => 'Test Tenant',
        'database_name' => 'tenant_'.Str::random(10),
        'database_username' => 'root',
        'database_password' => '',
        'database_host' => '127.0.0.1',
        'database_port' => 3306,
        'application_id' => $applicationId,
        'is_enabled' => true,
    ], $overrides));
}

function createTenantWithDomain(string $domain = 'existing.test'): Tenant
{
    $tenant = createTenant();
    $tenant->domains()->create(['domain' => $domain]);

    return $tenant;
}

test('guests are redirected to login when visiting tenants index', function () {
    /** @var TestCase $this */
    $response = $this->get(route('tenants.index'));
    $response->assertRedirect(route('login'));
});

test('authenticated user without view tenant is redirected to access denied', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('tenants.index'));
    $response->assertRedirect(route('access-denied'));
});

test('authenticated user with view tenant can visit tenants index', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant');
    $this->actingAs($user);

    $response = $this->get(route('tenants.index'));
    $response->assertOk();
});

test('authenticated user with create tenant permission can create a tenant', function () {
    /** @var TestCase $this */
    $this->mock(TenantProvisioningService::class, function ($mock) {
        $mock->shouldReceive('provision')->once()->andReturn(null);
    });

    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'create tenant');
    $this->actingAs($user);

    $applicationId = Application::where('code', 'vetmanagementsystem')->first()->id;

    $response = $this->post(route('tenants.store'), [
        'name' => 'Acme Corp',
        'hosts' => ['acme.test', 'www.acme.test'],
        'storage_domain' => 'acme-storage',
        'application_id' => $applicationId,
        'is_enabled' => true,
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('tenants.index'));

    $tenant = Tenant::where('name', 'Acme Corp')->first();
    expect($tenant)->not->toBeNull();
    expect($tenant->domains()->pluck('domain')->all())->toEqual(['acme.test', 'www.acme.test']);
});

test('authenticated user with update tenant permission can update a tenant', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'update tenant');
    $tenant = createTenantWithDomain('old.test');
    $this->actingAs($user);

    $applicationId = Application::where('code', 'vetmanagementsystem')->first()->id;

    $response = $this->put(route('tenants.update', $tenant), [
        'name' => 'Updated Tenant Name',
        'hosts' => ['updated.test', 'app.updated.test'],
        'storage_domain' => 'updated-storage',
        'application_id' => $applicationId,
        'is_enabled' => false,
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('tenants.index'));

    $tenant->refresh();
    $tenant->load('domains');
    expect($tenant->name)->toBe('Updated Tenant Name');
    expect($tenant->domains()->pluck('domain')->all())->toContain('updated.test');
    expect($tenant->domains()->pluck('domain')->all())->toContain('app.updated.test');
    expect($tenant->domains()->count())->toBe(2);
    expect($tenant->is_enabled)->toBeFalse();
});

test('authenticated user with update tenant can toggle is_enabled via PATCH enabled', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'update tenant');
    $tenant = createTenantWithDomain('app.test');
    $this->actingAs($user);

    $response = $this->patchJson(route('tenants.enabled.update', $tenant), ['is_enabled' => false]);

    $response->assertOk()->assertJson(['is_enabled' => false]);
    $tenant->refresh();
    expect($tenant->is_enabled)->toBeFalse();

    $response2 = $this->patchJson(route('tenants.enabled.update', $tenant), ['is_enabled' => true]);
    $response2->assertOk()->assertJson(['is_enabled' => true]);
    $tenant->refresh();
    expect($tenant->is_enabled)->toBeTrue();
});

test('authenticated user with delete tenant permission can delete a tenant', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'delete tenant');
    $tenant = createTenant();
    $tenantId = $tenant->id;
    $this->actingAs($user);

    $response = $this->delete(route('tenants.destroy', $tenant));

    $response->assertSessionHasNoErrors()->assertRedirect(route('tenants.index'));

    expect(Tenant::find($tenantId))->toBeNull();
});

test('tenant name is required when storing', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'create tenant');
    $this->actingAs($user);

    $applicationId = Application::where('code', 'vetmanagementsystem')->first()->id;

    $response = $this->post(route('tenants.store'), [
        'name' => '',
        'hosts' => [],
        'storage_domain' => null,
        'application_id' => $applicationId,
        'is_enabled' => true,
    ]);

    $response->assertSessionHasErrors('name');
});

test('tenant is_enabled is required when storing', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'create tenant');
    $this->actingAs($user);

    $response = $this->post(route('tenants.store'), [
        'name' => 'New Tenant',
        'hosts' => [],
        'storage_domain' => null,
        'application_id' => Application::where('code', 'vetmanagementsystem')->first()->id,
    ]);

    $response->assertSessionHasErrors('is_enabled');
});

test('host must be a valid domain with at least one dot when provided', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'create tenant');
    $this->actingAs($user);

    $response = $this->post(route('tenants.store'), [
        'name' => 'Vet Tenant',
        'hosts' => ['veterinar'],
        'storage_domain' => 'vet-storage',
        'application_id' => Application::where('code', 'vetmanagementsystem')->first()->id,
        'is_enabled' => true,
    ]);

    $response->assertSessionHasErrors('hosts.0');
});

test('host must be unique across tenants', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'create tenant');
    createTenantWithDomain('taken.test');
    $this->actingAs($user);

    $response = $this->post(route('tenants.store'), [
        'name' => 'Other Tenant',
        'hosts' => ['taken.test'],
        'storage_domain' => 'other-storage',
        'application_id' => Application::where('code', 'vetmanagementsystem')->first()->id,
        'is_enabled' => true,
    ]);

    $response->assertSessionHasErrors('hosts.0');
});

test('authenticated user with view tenant can visit tenant show page', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant');
    $tenant = createTenant();
    $this->actingAs($user);

    $response = $this->get(route('tenants.show', $tenant));

    $response->assertRedirect(route('tenants.index', ['modal' => 'view', 'tenant_id' => $tenant->id]));
});
