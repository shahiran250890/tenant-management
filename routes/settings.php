<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\PermissionController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\RoleController;
use App\Http\Controllers\Settings\SystemSettingController;
use App\Http\Controllers\Settings\TwoFactorAuthenticationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('user-password.edit');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');

    Route::get('settings/two-factor', [TwoFactorAuthenticationController::class, 'show'])
        ->middleware('confirm-two-factor-password')
        ->name('two-factor.show');

    Route::get('settings/system', SystemSettingController::class)->name('settings.system.index');

    Route::resource('settings/system/roles', RoleController::class)
        ->names('settings.system.roles')
        ->parameters(['roles' => 'role']);

    Route::resource('settings/system/permissions', PermissionController::class)
        ->names('settings.system.permissions')
        ->parameters(['permissions' => 'permission']);
});
