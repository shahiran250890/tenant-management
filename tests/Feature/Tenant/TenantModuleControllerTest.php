<?php

use App\Models\Module;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantModuleSyncService;
use Database\Seeders\ModuleSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Str;
use Tests\TestCase;

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
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant', 'update tenant');
    $this->actingAs($user);

    $tenant = createTenantForModuleTest();
    $modules = Module::where('is_enabled', true)->orderBy('id')->get();
    $firstId = $modules->first()->id;
    $payload = [
        'modules' => $modules->map(fn ($m) => [
            'id' => $m->id,
            'is_enabled' => $m->id === $firstId,
        ])->values()->all(),
    ];

    $called = false;
    $this->app->bind(TenantModuleSyncService::class, function () use (&$called, $tenant, $payload) {
        return new class($called, $tenant, $payload) extends TenantModuleSyncService
        {
            public function __construct(
                private bool &$called,
                private Tenant $tenant,
                private array $payload
            ) {}

            public function syncToTenantDatabase(Tenant $tenant, array $modules): void
            {
                $this->called = true;

                expect($tenant->is($this->tenant))->toBeTrue();
                expect($modules)->toBe($this->payload['modules']);
            }
        };
    });

    $response = $this->put(route('tenants.modules.update', $tenant), $payload);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();
    expect($called)->toBeTrue();
});

test('authenticated user without update tenant cannot update tenant modules', function () {
    /** @var TestCase $this */
    $user = User::factory()->create();
    $user->givePermissionTo('view tenant');
    $this->actingAs($user);

    $tenant = createTenantForModuleTest();
    $modules = Module::where('is_enabled', true)->take(1)->get();
    $payload = [
        'modules' => [['id' => $modules->first()->id, 'is_enabled' => true]],
    ];

    $response = $this->put(route('tenants.modules.update', $tenant), $payload);

    $response->assertRedirect();
    expect(in_array($response->headers->get('Location'), [route('access-denied'), route('login')], true))->toBeTrue();
});
