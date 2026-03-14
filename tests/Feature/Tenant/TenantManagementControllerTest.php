<?php

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function createTenant(array $overrides = []): Tenant
{
    return Tenant::create(array_merge([
        'name' => 'Test Tenant',
        'database_name' => 'tenant_'.Str::random(10),
        'database_username' => 'root',
        'database_password' => '',
        'database_host' => '127.0.0.1',
        'database_port' => 3306,
        'is_active' => 1,
    ], $overrides));
}

test('guests are redirected to login when visiting tenants index', function () {
    $response = $this->get(route('tenants.index'));
    $response->assertRedirect(route('login'));
});

test('authenticated user without view tenant is redirected to access denied', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('tenants.index'));
    $response->assertRedirect(route('access-denied'));
});

test('authenticated user with view tenant can visit tenants index', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant');
    $this->actingAs($user);

    $response = $this->get(route('tenants.index'));
    $response->assertOk();
});

test('authenticated user with create tenant permission can create a tenant', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'create tenant');
    $this->actingAs($user);

    $response = $this->post(route('tenants.store'), [
        'name' => 'Acme Corp',
        'host' => 'acme.test',
        'storage_domain' => 'acme-storage',
        'is_active' => true,
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('tenants.index'));

    expect(Tenant::where('name', 'Acme Corp')->exists())->toBeTrue();
});

test('authenticated user with update tenant permission can update a tenant', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'update tenant');
    $tenant = createTenant(['name' => 'Old Name']);
    $this->actingAs($user);

    $response = $this->put(route('tenants.update', $tenant), [
        'name' => 'Updated Tenant Name',
        'host' => 'updated.test',
        'storage_domain' => 'updated-storage',
        'is_active' => false,
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('tenants.index'));

    $tenant->refresh();
    expect($tenant->name)->toBe('Updated Tenant Name');
    expect($tenant->host)->toBe('updated.test');
    expect($tenant->is_active)->toBe(0);
});

test('authenticated user with delete tenant permission can delete a tenant', function () {
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
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'create tenant');
    $this->actingAs($user);

    $response = $this->post(route('tenants.store'), [
        'name' => '',
        'host' => null,
        'storage_domain' => null,
        'is_active' => true,
    ]);

    $response->assertSessionHasErrors('name');
});

test('tenant is_active is required when storing', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'create tenant');
    $this->actingAs($user);

    $response = $this->post(route('tenants.store'), [
        'name' => 'New Tenant',
        'host' => null,
        'storage_domain' => null,
    ]);

    $response->assertSessionHasErrors('is_active');
});

test('authenticated user with view tenant can visit tenant show page', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant');
    $tenant = createTenant();
    $this->actingAs($user);

    $response = $this->get(route('tenants.show', $tenant));

    $response->assertOk();
});
