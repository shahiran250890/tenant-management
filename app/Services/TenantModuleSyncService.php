<?php

namespace App\Services;

use App\Models\Module;
use App\Models\Tenant;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

class TenantModuleSyncService
{
    /**
     * @param  array<int, array{id: int, is_enabled: bool}>  $modules
     */
    public function syncToTenantDatabase(Tenant $tenant, array $modules): void
    {
        $moduleIds = collect($modules)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        if ($moduleIds === []) {
            return;
        }

        $moduleModels = Module::query()
            ->whereIn('id', $moduleIds)
            ->get(['id', 'name', 'key']);

        $enabledById = collect($modules)
            ->mapWithKeys(fn (array $item) => [(int) $item['id'] => (bool) $item['is_enabled']]);

        $now = now();
        $rows = $moduleModels
            ->map(function (Module $module) use ($enabledById, $now): array {
                return [
                    'name' => $module->name,
                    'key' => $module->key,
                    'is_enabled' => $enabledById->get($module->id, false),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            })
            ->values()
            ->all();

        $connectionName = 'tenant_module_sync_'.str_replace('-', '_', $tenant->id);

        Config::set('database.connections.'.$connectionName, [
            'driver' => 'mysql',
            'host' => $tenant->database_host ?? '127.0.0.1',
            'port' => $tenant->database_port ?? 3306,
            'database' => $tenant->database_name,
            'username' => $tenant->database_username,
            'password' => $tenant->database_password ?? '',
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'strict' => true,
            'engine' => null,
        ]);

        try {
            DB::connection($connectionName)
                ->table('module')
                ->upsert($rows, ['key'], ['name', 'is_enabled', 'updated_at']);
        } finally {
            DB::purge($connectionName);
            Config::set('database.connections.'.$connectionName, null);
        }
    }
}
