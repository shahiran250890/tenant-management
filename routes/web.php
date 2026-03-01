<?php

use App\Http\Controllers\Tenant\TenantManagementController;
use App\Http\Controllers\Users\UserController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::resource('users', UserController::class);
    Route::resource('tenants', TenantManagementController::class);
});

require __DIR__.'/settings.php';
