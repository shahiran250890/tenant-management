<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;

class ModuleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $modules = [
            ['name' => 'Dashboard', 'key' => 'dashboard', 'is_enabled' => true],
            ['name' => 'Patients', 'key' => 'patients', 'is_enabled' => true],
            ['name' => 'Finances', 'key' => 'finances', 'is_enabled' => true],
            ['name' => 'Reports', 'key' => 'reports', 'is_enabled' => true],
            ['name' => 'Settings', 'key' => 'settings', 'is_enabled' => true],
        ];

        foreach ($modules as $module) {
            Module::firstOrCreate(
                ['key' => $module['key']],
                $module
            );
        }
    }
}
