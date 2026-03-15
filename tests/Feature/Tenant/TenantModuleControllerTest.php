<?php

use App\Models\Module;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\ModuleSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    /** @var TestCase $this */
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ModuleSeeder::class);
});

function createTenantForModuleTest(): Tenant
{
    return Tenant::create([
        'name' => 'Acme',
        'database_name' => 'acme_'.Str::random(10),
        'database_username' => 'root',
        'database_password' => '',
        'database_host' => '127.0.0.1',
        'database_port' => 3306,
        'is_enabled' => true,
    ]);
}

test('authenticated user with update tenant can update tenant modules', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'update tenant');
    $tenant = createTenantForModuleTest();
    $modules = Module::where('is_enabled', true)->orderBy('id')->get();
    $firstId = $modules->first()->id;
    $payload = [
        'modules' => $modules->map(fn ($m) => [
            'id' => $m->id,
            'is_enabled' => $m->id === $firstId,
        ])->values()->all(),
    ];

    $response = $this->put(route('tenants.modules.update', $tenant), $payload);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();
});

test('authenticated user without update tenant cannot update tenant modules', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant');
    $tenant = createTenantForModuleTest();
    $modules = Module::where('is_enabled', true)->take(1)->get();
    $payload = [
        'modules' => [['id' => $modules->first()->id, 'is_enabled' => true]],
    ];

    $response = $this->put(route('tenants.modules.update', $tenant), $payload);

    $response->assertRedirect();
    expect(in_array($response->headers->get('Location'), [route('access-denied'), route('login')], true))->toBeTrue();
});
