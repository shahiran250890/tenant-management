<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Tenant application paths
    |--------------------------------------------------------------------------
    |
    | Map application key (stored on tenants.application) to the absolute path
    | of the Laravel project that owns tenant migrations. When a new tenant
    | is stored, the system creates the tenant database and runs that
    | project's tenant migrations (e.g. database/migrations/tenant).
    |
    */

    /*
    |--------------------------------------------------------------------------
    | PHP CLI binary for running artisan in application projects
    |--------------------------------------------------------------------------
    |
    | When running tenant migrations we spawn a subprocess (e.g. php artisan ...).
    | Use the PHP CLI binary here, not the FPM binary. On Laravel Herd, PHP_BINARY
    | in web context is often php84-fpm, which cannot run artisan. Default 'php'
    | uses the CLI from PATH; set PHP_CLI_PATH in .env if needed (e.g. /path/to/php84).
    |
    */
    'php_binary' => env('PHP_CLI_PATH', 'php'),

    'applications' => [
        'vetmanagementsystem' => env('VETMANAGEMENTSYSTEM_PATH', base_path('../vetmanagementsystem')),
    ],

];
