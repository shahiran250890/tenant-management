<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Tenant\TenantManagementController;
use App\Http\Controllers\Tenant\TenantModuleController;
use App\Http\Controllers\Users\UserController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::inertia('access-denied', 'errors/access-denied')->name('access-denied');
    Route::prefix('users')->name('users.')->group(function () {
        Route::patch('{user}/enabled', [UserController::class, 'updateEnabled'])->name('enabled.update');
    });
    Route::resource('users', UserController::class);

    Route::prefix('tenants')->name('tenants.')->group(function () {
        Route::put('{tenant}/modules', [TenantModuleController::class, 'update'])->name('modules.update');
        Route::patch('{tenant}/enabled', [TenantManagementController::class, 'updateEnabled'])->name('enabled.update');
    });
    Route::resource('tenants', TenantManagementController::class);
});

require __DIR__.'/settings.php';
