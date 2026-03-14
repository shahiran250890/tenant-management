<?php

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('guests are redirected to login when visiting permissions index', function () {
    $response = $this->get(route('settings.permissions.index'));
    $response->assertRedirect(route('login'));
});

test('authenticated user without view permission is redirected to access denied', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('settings.permissions.index'));
    $response->assertRedirect(route('access-denied'));
});

test('authenticated user with view permission can visit permissions index', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view permission');
    $this->actingAs($user);

    $response = $this->get(route('settings.permissions.index'));
    $response->assertOk();
});

test('authenticated user with create permission can create a permission', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view permission', 'create permission');
    $this->actingAs($user);

    $response = $this->post(route('settings.permissions.store'), [
        'name' => 'view reports',
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('settings.permissions.index'));

    expect(Permission::where('name', 'view reports')->exists())->toBeTrue();
});

test('authenticated user with update permission can update a permission', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view permission', 'update permission');
    $permission = Permission::create(['name' => 'view reports', 'guard_name' => 'web']);
    $this->actingAs($user);

    $response = $this->put(route('settings.permissions.update', $permission), [
        'name' => 'view analytics',
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('settings.permissions.index'));

    expect($permission->fresh()->name)->toBe('view analytics');
});

test('authenticated user with delete permission can delete a permission', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view permission', 'delete permission');
    $permission = Permission::create(['name' => 'view reports', 'guard_name' => 'web']);
    $this->actingAs($user);

    $response = $this->delete(route('settings.permissions.destroy', $permission));

    $response->assertSessionHasNoErrors()->assertRedirect(route('settings.permissions.index'));

    expect(Permission::find($permission->id))->toBeNull();
});

test('permission name is required when storing', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view permission', 'create permission');
    $this->actingAs($user);

    $response = $this->post(route('settings.permissions.store'), [
        'name' => '',
    ]);

    $response->assertSessionHasErrors('name');
});

test('permission name must be unique when storing', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view permission', 'create permission');
    Permission::create(['name' => 'view reports', 'guard_name' => 'web']);
    $this->actingAs($user);

    $response = $this->post(route('settings.permissions.store'), [
        'name' => 'view reports',
    ]);

    $response->assertSessionHasErrors('name');
});
