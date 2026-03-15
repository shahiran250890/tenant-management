<?php

use App\Models\Module;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Tests\TestCase;

beforeEach(function () {
    /** @var TestCase $this */
    $this->seed(RolePermissionSeeder::class);
});

test('guests are redirected to login when visiting modules index', function () {
    /** @var TestCase $this */
    $response = $this->get(route('settings.system.modules.index'));
    $response->assertRedirect(route('login'));
});

test('authenticated user without view module is redirected to access denied', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('settings.system.modules.index'));
    $response->assertRedirect(route('access-denied'));
});

test('authenticated user with view module can visit modules index', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view module');
    $this->actingAs($user);

    $response = $this->get(route('settings.system.modules.index'));
    $response->assertOk();
});

test('authenticated user with create module permission can create a module', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view module', 'create module');
    $this->actingAs($user);

    $response = $this->post(route('settings.system.modules.store'), [
        'name' => 'Reports',
        'key' => 'reports',
        'is_enabled' => true,
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('settings.system.modules.index'));

    $module = Module::where('key', 'reports')->first();
    expect($module)->not->toBeNull();
    expect($module->name)->toBe('Reports');
    expect($module->is_enabled)->toBeTrue();
});

test('authenticated user with update module permission can update a module', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view module', 'update module');
    $module = Module::create(['name' => 'Finances', 'key' => 'finances', 'is_enabled' => true]);
    $this->actingAs($user);

    $response = $this->put(route('settings.system.modules.update', $module), [
        'name' => 'Finance',
        'key' => 'finance',
        'is_enabled' => false,
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('settings.system.modules.index'));

    $module->refresh();
    expect($module->name)->toBe('Finance');
    expect($module->key)->toBe('finance');
    expect($module->is_enabled)->toBeFalse();
});

test('authenticated user with delete module permission can delete a module', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view module', 'delete module');
    $module = Module::create(['name' => 'Legacy', 'key' => 'legacy', 'is_enabled' => true]);
    $this->actingAs($user);

    $response = $this->delete(route('settings.system.modules.destroy', $module));

    $response->assertSessionHasNoErrors()->assertRedirect(route('settings.system.modules.index'));

    expect(Module::find($module->id))->toBeNull();
});

test('module name is required when storing', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view module', 'create module');
    $this->actingAs($user);

    $response = $this->post(route('settings.system.modules.store'), [
        'name' => '',
        'key' => 'reports',
        'is_enabled' => true,
    ]);

    $response->assertSessionHasErrors('name');
});

test('module key is required and must be unique when storing', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view module', 'create module');
    Module::create(['name' => 'Dashboard', 'key' => 'dashboard', 'is_enabled' => true]);
    $this->actingAs($user);

    $response = $this->post(route('settings.system.modules.store'), [
        'name' => 'Dashboard',
        'key' => 'dashboard',
        'is_enabled' => true,
    ]);

    $response->assertSessionHasErrors('key');
});

test('module key must match format when storing', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view module', 'create module');
    $this->actingAs($user);

    $response = $this->post(route('settings.system.modules.store'), [
        'name' => 'Bad Key',
        'key' => 'Bad-Key',
        'is_enabled' => true,
    ]);

    $response->assertSessionHasErrors('key');
});
