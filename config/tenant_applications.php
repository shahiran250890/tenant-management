<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Tenant application paths
    |--------------------------------------------------------------------------
    |
    | Map each application code (must match the "code" on the applications table
    | and the value stored on tenants.application_id) to the filesystem path
    | of that Laravel project. This app uses that path to run tenant migrations,
    | seeders, and other artisan commands (e.g. ensure-tenant-user) for each tenant.
    |
    | Add one entry per tenant-capable application. Override any path in .env
    | (e.g. VETMANAGEMENTSYSTEM_PATH) for production or when projects are not
    | side-by-side.
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
        // Key must match application.code (e.g. applications table). Value = path to that Laravel app.
        // base_path('../vetmanagementsystem') = sibling folder when tenant-management and vetmanagementsystem
        // sit side-by-side (e.g. development/tenant-management and development/vetmanagementsystem).
        // Override with VETMANAGEMENTSYSTEM_PATH in .env for an absolute path if needed.
        'vetmanagementsystem' => env('VETMANAGEMENTSYSTEM_PATH', base_path('../vetmanagementsystem')),
    ],

];
