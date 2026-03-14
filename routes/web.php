<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Tenant\TenantManagementController;
use App\Http\Controllers\Users\UserController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::inertia('access-denied', 'errors/access-denied')->name('access-denied');
    Route::resource('users', UserController::class);
    Route::resource('tenants', TenantManagementController::class);
});

require __DIR__.'/settings.php';
