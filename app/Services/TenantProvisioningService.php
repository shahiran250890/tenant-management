<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Contracts\Process\ProcessResult;
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
        ['application' => $application, 'path' => $path] = $this->resolveTenantApplicationContext(
            $tenant,
            'Tenant has no application configured. Assign an application to this tenant first.'
        );

        $phpBinary = $this->resolvePhpBinary();
        Log::info('Tenant provisioning: running migrations', [
            'tenant_id' => $tenant->id,
            'application' => $application,
            'php_binary' => $phpBinary,
        ]);
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
            $details = $this->formatProcessFailureMessage($result);

            Log::error('Tenant migrations failed', [
                'tenant_id' => $tenant->id,
                'application' => $application,
                'output' => $result->output(),
                'error' => $result->errorOutput(),
                'exit_code' => $result->exitCode(),
            ]);

            throw new RuntimeException(
                "Tenant migrations failed for tenant [{$tenant->id}]: ".$details
            );
        }
    }

    /**
     * Run the application project's database seeders for this tenant (tenant DB context).
     */
    public function runTenantSeeders(Tenant $tenant): void
    {
        ['application' => $application, 'path' => $path] = $this->resolveTenantApplicationContext(
            $tenant,
            'Tenant has no application configured for seeding.'
        );

        $phpBinary = $this->resolvePhpBinary();
        $result = Process::path($path)
            ->timeout(120)
            ->run([
                $phpBinary,
                'artisan',
                'tenants:artisan',
                'db:seed --database=tenant',
                '--tenant='.$tenant->id,
            ]);

        if (! $result->successful()) {
            $details = $this->formatProcessFailureMessage($result);

            Log::error('Tenant seeding failed', [
                'tenant_id' => $tenant->id,
                'application' => $application,
                'output' => $result->output(),
                'error' => $result->errorOutput(),
                'exit_code' => $result->exitCode(),
            ]);

            $tenant->update([
                'setup_status' => 'failed',
                'setup_stage' => 'seeder',
                'setup_error' => $details,
                'setup_failed_at' => now(),
                'setup_completed_at' => null,
            ]);

            throw new RuntimeException(
                "Tenant seeding failed for tenant [{$tenant->id}]: ".$details
            );
        }
    }

    /**
     * Ensure the tenant has at least one user: run UserSeeder only if the tenant's users table is empty.
     * Invokes the application's ensure-tenant-user command via tenants:artisan.
     *
     * @return 'seeded' if users were created, 'skipped' if tenant already had users
     *
     * @throws \RuntimeException if application path is missing or command fails
     */
    public function ensureTenantUser(Tenant $tenant): string
    {
        ['application' => $application, 'path' => $path] = $this->resolveTenantApplicationContext(
            $tenant,
            'Tenant has no application configured.'
        );

        $phpBinary = $this->resolvePhpBinary();
        $command = [
            $phpBinary,
            'artisan',
            'tenants:artisan',
            'ensure-tenant-user',
            '--tenant='.$tenant->id,
        ];

        Log::info('Tenant ensureTenantUser: running command', [
            'tenant_id' => $tenant->id,
            'tenant_name' => $tenant->name,
            'application' => $application,
            'application_path' => $path,
            'command' => implode(' ', $command),
        ]);

        $result = Process::path($path)
            ->timeout(120)
            ->run($command);

        $output = trim($result->output().$result->errorOutput());
        $lastLine = str_contains($output, "\n") ? trim(substr($output, strrpos($output, "\n") + 1)) : $output;

        // Treat output as source of truth: tenants:artisan has void handle() so it does not propagate
        // the inner command exit code; the process can exit 0 even when the seeder failed.
        $isSuccess = $lastLine === 'seeded' || $lastLine === 'skipped';

        if (! $isSuccess) {
            Log::error('Tenant ensure-user failed', [
                'tenant_id' => $tenant->id,
                'application' => $application,
                'process_exit_code' => $result->exitCode(),
                'output' => $result->output(),
                'error' => $result->errorOutput(),
            ]);

            if (str_contains($output, 'no-tenant') || str_contains($output, 'No tenant(s) found')) {
                throw new RuntimeException(
                    "Tenant [{$tenant->id}] was not found in the application's landlord database. "
                    ."Ensure the application (e.g. {$application}) has a tenant record with this id in its landlord tenants table, "
                    .'so that tenants:artisan can run in the correct tenant context.'
                );
            }

            if (str_contains($output, 'Column not found') || str_contains($output, 'Unknown column')) {
                throw new RuntimeException(
                    'Tenant schema is out of date (missing column or table). Run tenant migrations for this tenant first (Run migrations in the tenant actions menu), then try Create tenant user again.'
                );
            }

            throw new RuntimeException(
                "Ensure tenant user failed for tenant [{$tenant->id}]. Run tenant migrations if the schema is out of date, then try again. Output: ".$output
            );
        }

        Log::info('Tenant ensureTenantUser: command finished', [
            'tenant_id' => $tenant->id,
            'raw_output' => $output,
            'parsed_last_line' => $lastLine,
            'result' => $lastLine,
        ]);

        return $lastLine === 'seeded' ? 'seeded' : 'skipped';
    }

    /**
     * Artisan often writes failures to stdout; stderr may be empty. Combine both for diagnostics.
     */
    private function formatProcessFailureMessage(ProcessResult $result): string
    {
        $combined = trim($result->output().PHP_EOL.$result->errorOutput());

        if ($combined !== '') {
            return $combined;
        }

        $code = $result->exitCode();

        return $code !== null
            ? "No output captured (exit code {$code})."
            : 'No output captured.';
    }

    /**
     * Resolve the PHP CLI binary for subprocess.
     *
     * Queue workers often run as plain `php` (e.g. 8.2) while tenant apps require 8.4+.
     * Prefer explicit `PHP_CLI_PATH` from config; otherwise detect Laravel Herd's php84 on macOS.
     * When running under PHP-FPM, derive CLI from PHP_BINARY (e.g. php84-fpm -> php84).
     */
    private function resolvePhpBinary(): string
    {
        $configured = trim((string) config('tenant_applications.php_binary', 'php'));

        if ($configured !== '' && $configured !== 'php') {
            return $configured;
        }

        $herdPhp84 = $this->herdPhp84BinaryPath();
        if ($herdPhp84 !== null) {
            return $herdPhp84;
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

    /**
     * Laravel Herd installs versioned PHP binaries under ~/Library/Application Support/Herd/bin/.
     */
    private function herdPhp84BinaryPath(): ?string
    {
        $home = getenv('HOME');
        if (! is_string($home) || $home === '') {
            return null;
        }

        $path = $home.'/Library/Application Support/Herd/bin/php84';

        return is_file($path) && is_executable($path) ? $path : null;
    }

    /**
     * @return array{application: string, path: string}
     */
    private function resolveTenantApplicationContext(Tenant $tenant, string $missingApplicationMessage): array
    {
        $application = $tenant->relationLoaded('application')
            ? $tenant->application?->code
            : $tenant->application()->first()?->code;

        if (! is_string($application) || $application === '') {
            throw new RuntimeException($missingApplicationMessage);
        }

        $applications = config('tenant_applications.applications', []);
        $path = $applications[$application] ?? null;

        if ($path === null || ! is_dir($path)) {
            throw new RuntimeException("Application path for [{$application}] is not configured or does not exist.");
        }

        $artisanPath = rtrim($path, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'artisan';
        if (! is_file($artisanPath)) {
            throw new RuntimeException("Artisan not found at [{$artisanPath}] for application [{$application}].");
        }

        return [
            'application' => $application,
            'path' => $path,
        ];
    }
}
