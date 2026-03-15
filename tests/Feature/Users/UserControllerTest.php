<?php

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Tests\TestCase;

beforeEach(function () {
    /** @var TestCase $this */
    $this->seed(RolePermissionSeeder::class);
});

test('guests are redirected to login when visiting users index', function () {
    /** @var TestCase $this */
    $response = $this->get(route('users.index'));
    $response->assertRedirect(route('login'));
});

test('authenticated user without view user is redirected to access denied', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('users.index'));
    $response->assertRedirect(route('access-denied'));
});

test('authenticated user with view user can visit users index', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view user');
    $this->actingAs($user);

    $response = $this->get(route('users.index'));
    $response->assertOk();
});

test('authenticated user with create user permission can create a user', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view user', 'create user');
    $this->actingAs($user);

    $response = $this->post(route('users.store'), [
        'name' => 'New User',
        'email' => 'newuser@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'is_enabled' => true,
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('users.index'));

    expect(User::where('email', 'newuser@example.com')->exists())->toBeTrue();
});

test('authenticated user with create user permission can assign role when creating user', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view user', 'create user');
    $this->actingAs($user);

    $response = $this->post(route('users.store'), [
        'name' => 'Staff User',
        'email' => 'staff@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'is_enabled' => true,
        'role' => 'admin',
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('users.index'));

    $created = User::where('email', 'staff@example.com')->first();
    expect($created)->not->toBeNull();
    expect($created->hasRole('admin'))->toBeTrue();
});

test('authenticated user with update user permission can update a user', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view user', 'update user');
    $target = User::factory()->create(['name' => 'Old Name', 'email' => 'old@example.com']);
    $this->actingAs($user);

    $response = $this->put(route('users.update', $target), [
        'name' => 'Updated Name',
        'email' => 'updated@example.com',
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('users.index'));

    expect($target->fresh()->name)->toBe('Updated Name');
    expect($target->fresh()->email)->toBe('updated@example.com');
});

test('authenticated user with delete user permission can delete a user', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view user', 'delete user');
    $target = User::factory()->create();
    $targetId = $target->id;
    $this->actingAs($user);

    $response = $this->delete(route('users.destroy', $target));

    $response->assertSessionHasNoErrors()->assertRedirect(route('users.index'));

    expect(User::find($targetId))->toBeNull();
});

test('user name is required when storing', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view user', 'create user');
    $this->actingAs($user);

    $response = $this->post(route('users.store'), [
        'name' => '',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'is_enabled' => true,
    ]);

    $response->assertSessionHasErrors('name');
});

test('user email is required when storing', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view user', 'create user');
    $this->actingAs($user);

    $response = $this->post(route('users.store'), [
        'name' => 'Test User',
        'email' => '',
        'password' => 'password',
        'password_confirmation' => 'password',
        'is_enabled' => true,
    ]);

    $response->assertSessionHasErrors('email');
});

test('user email must be unique when storing', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view user', 'create user');
    User::factory()->create(['email' => 'existing@example.com']);
    $this->actingAs($user);

    $response = $this->post(route('users.store'), [
        'name' => 'Test User',
        'email' => 'existing@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'is_enabled' => true,
    ]);

    $response->assertSessionHasErrors('email');
});

test('user password is required when storing', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view user', 'create user');
    $this->actingAs($user);

    $response = $this->post(route('users.store'), [
        'name' => 'Test User',
        'email' => 'new@example.com',
        'password' => '',
        'password_confirmation' => '',
        'is_enabled' => true,
    ]);

    $response->assertSessionHasErrors('password');
});

test('user password must be confirmed when storing', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view user', 'create user');
    $this->actingAs($user);

    $response = $this->post(route('users.store'), [
        'name' => 'Test User',
        'email' => 'new@example.com',
        'password' => 'password',
        'password_confirmation' => 'different',
        'is_enabled' => true,
    ]);

    $response->assertSessionHasErrors('password');
});
