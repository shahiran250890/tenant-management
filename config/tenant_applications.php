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
    | Use the PHP CLI binary here, not the FPM binary. Queue workers may run as PHP 8.2
    | while tenant apps require 8.4+: set PHP_CLI_PATH to Herd's php84, or leave unset
    | and the service will auto-detect ~/Library/Application Support/Herd/bin/php84 on macOS.
    |
    */
    'php_binary' => env('PHP_CLI_PATH', 'php'),

    'internal_api' => [
        'issuer' => env('INTERNAL_SETUP_ISSUER', 'tenant-management'),
        'shared_secret' => env('INTERNAL_SETUP_SHARED_SECRET', 'ea2c45eda2ff7f48d7b5c93eb48beba60b4bad9a7b34230adc2c28b6ea962dab'),
        'timeout_seconds' => (int) env('INTERNAL_SETUP_TIMEOUT_SECONDS', 120),
        'default_scheme' => env('INTERNAL_SETUP_DEFAULT_SCHEME', 'http'),
    ],

    'applications' => [
        // Key must match application.code (e.g. applications table). Value = path to that Laravel app.
        // base_path('../vetmanagementsystem') = sibling folder when tenant-management and vetmanagementsystem
        // sit side-by-side (e.g. development/tenant-management and development/vetmanagementsystem).
        // Override with VETMANAGEMENTSYSTEM_PATH in .env for an absolute path if needed.
        'vetmanagementsystem' => env('VETMANAGEMENTSYSTEM_PATH', base_path('../vetmanagementsystem')),
    ],

    'api_base_urls' => [
        'vetmanagementsystem' => env('VETMANAGEMENTSYSTEM_API_BASE_URL', 'https://vetmanagementsystem.test'),
    ],

];
