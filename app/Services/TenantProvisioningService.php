<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use RuntimeException;

/**
 * Provisions a new tenant: creates its MySQL database and runs the application's tenant migrations.
 *
 * Portable across local and server environments:
 * - Database: uses the tenant's stored credentials (any MySQL host/port the app can reach).
 * - Application path: set per environment via config/tenant_applications.php or env (e.g. VETMANAGEMENTSYSTEM_PATH).
 * - PHP CLI: set PHP_CLI_PATH in .env when the auto-detect (FPM→CLI) does not apply (e.g. production, Docker).
 *
 * Requires: MySQL for tenant DBs; subprocess execution allowed; application project at the configured path.
 */
class TenantProvisioningService
{
    /**
     * Create the tenant's database and run the application's tenant migrations.
     *
     * @throws \RuntimeException if database creation or migration fails
     */
    public function provision(Tenant $tenant): void
    {
        $this->createDatabase($tenant);
        $this->runTenantMigrations($tenant);
    }

    /**
     * Create the MySQL database for the tenant using the tenant's connection credentials.
     */
    public function createDatabase(Tenant $tenant): void
    {
        $connectionName = 'tenant_provision_'.str_replace('-', '_', $tenant->id);

        Config::set('database.connections.'.$connectionName, [
            'driver' => 'mysql',
            'host' => $tenant->database_host ?? '127.0.0.1',
            'port' => $tenant->database_port ?? 3306,
            'database' => 'mysql',
            'username' => $tenant->database_username,
            'password' => $tenant->database_password ?? '',
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'strict' => true,
            'engine' => null,
        ]);

        $databaseName = str_replace('`', '``', $tenant->database_name);

        DB::connection($connectionName)->statement("CREATE DATABASE IF NOT EXISTS `{$databaseName}`");

        DB::purge($connectionName);
        Config::set('database.connections.'.$connectionName, null);
    }

    /**
     * Run the application project's tenant migrations for this tenant.
     * Resolves the application path from config('tenant_applications.applications')[tenant.application].
     */
    public function runTenantMigrations(Tenant $tenant): void
    {
        $application = $tenant->relationLoaded('application')
            ? $tenant->application?->code
            : $tenant->application()->first()?->code;

        if (! is_string($application) || $application === '') {
            Log::warning('Tenant provisioning skipped: tenant has no application', ['tenant_id' => $tenant->id]);

            return;
        }

        $applications = config('tenant_applications.applications', []);
        $path = $applications[$application] ?? null;

        if ($path === null || ! is_dir($path)) {
            throw new RuntimeException("Application path for [{$application}] is not configured or does not exist. Add it to config/tenant_applications.php and ensure VETMANAGEMENTSYSTEM_PATH (or the relevant env) is set.");
        }

        $artisanPath = rtrim($path, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'artisan';
        if (! is_file($artisanPath)) {
            throw new RuntimeException("Artisan not found at [{$artisanPath}] for application [{$application}].");
        }

        $phpBinary = $this->resolvePhpBinary();
        $migrateCommand = 'migrate --path=database/migrations/tenant --database=tenant';
        $result = Process::path($path)
            ->timeout(120)
            ->run([
                $phpBinary,
                'artisan',
                'tenants:artisan',
                $migrateCommand,
                '--tenant='.$tenant->id,
            ]);

        if (! $result->successful()) {
            Log::error('Tenant migrations failed', [
                'tenant_id' => $tenant->id,
                'application' => $application,
                'output' => $result->output(),
                'error' => $result->errorOutput(),
            ]);

            throw new RuntimeException(
                "Tenant migrations failed for tenant [{$tenant->id}]: ".$result->errorOutput()
            );
        }
    }

    /**
     * Resolve the PHP CLI binary for subprocess. When running under PHP-FPM (e.g. Herd),
     * 'php' is often not in PATH. Derive CLI from PHP_BINARY (e.g. php84-fpm -> php84).
     */
    private function resolvePhpBinary(): string
    {
        $configured = config('tenant_applications.php_binary', 'php');

        if ($configured !== 'php') {
            return $configured;
        }

        if (! defined('PHP_BINARY') || PHP_BINARY === '') {
            return 'php';
        }

        $fpm = PHP_BINARY;
        if (str_contains($fpm, '-fpm')) {
            $cli = preg_replace('/-fpm$/i', '', $fpm);
            if ($cli !== $fpm && is_executable($cli)) {
                return $cli;
            }
        }

        return 'php';
    }
}
