<?php

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('guests are redirected to login when visiting roles index', function () {
    $response = $this->get(route('settings.roles.index'));
    $response->assertRedirect(route('login'));
});

test('authenticated user without view role is redirected to access denied', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('settings.roles.index'));
    $response->assertRedirect(route('access-denied'));
});

test('authenticated user with view role can visit roles index', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view role');
    $this->actingAs($user);

    $response = $this->get(route('settings.roles.index'));
    $response->assertOk();
});

test('authenticated user with create role permission can create a role', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view role', 'create role');
    $this->actingAs($user);

    $response = $this->post(route('settings.roles.store'), [
        'name' => 'staff',
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('settings.roles.index'));

    expect(Role::where('name', 'staff')->exists())->toBeTrue();
});

test('authenticated user with update role permission can update a role', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view role', 'update role');
    $role = Role::create(['name' => 'finance', 'guard_name' => 'web']);
    $this->actingAs($user);

    $response = $this->put(route('settings.roles.update', $role), [
        'name' => 'finance-team',
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('settings.roles.index'));

    expect($role->fresh()->name)->toBe('finance-team');
});

test('authenticated user with delete role permission can delete a role', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view role', 'delete role');
    $role = Role::create(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs($user);

    $response = $this->delete(route('settings.roles.destroy', $role));

    $response->assertSessionHasNoErrors()->assertRedirect(route('settings.roles.index'));

    expect(Role::find($role->id))->toBeNull();
});

test('role name is required when storing', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view role', 'create role');
    $this->actingAs($user);

    $response = $this->post(route('settings.roles.store'), [
        'name' => '',
    ]);

    $response->assertSessionHasErrors('name');
});

test('role name must be unique when storing', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view role', 'create role');
    Role::create(['name' => 'staff', 'guard_name' => 'web']);
    $this->actingAs($user);

    $response = $this->post(route('settings.roles.store'), [
        'name' => 'staff',
    ]);

    $response->assertSessionHasErrors('name');
});

test('role update can sync permissions', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view role', 'update role');
    $role = Role::create(['name' => 'staff', 'guard_name' => 'web']);
    $role->givePermissionTo('view user');
    $this->actingAs($user);

    $response = $this->put(route('settings.roles.update', $role), [
        'name' => 'staff',
        'permissions' => ['view user', 'create user'],
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('settings.roles.index'));

    $role->refresh();
    expect($role->getPermissionNames()->sort()->values()->all())
        ->toBe(collect(['create user', 'view user'])->sort()->values()->all());
});
