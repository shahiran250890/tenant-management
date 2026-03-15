<?php

namespace Database\Seeders;

use App\Models\Application;
use Illuminate\Database\Seeder;

class ApplicationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $applications = [
            [
                'code' => 'vetmanagementsystem',
                'name' => 'Vet Management System',
                'path' => env('VETMANAGEMENTSYSTEM_PATH', base_path('../vetmanagementsystem')),
                'description' => 'Vet Management System',
                'is_enabled' => true,
            ],
        ];

        foreach ($applications as $attributes) {
            Application::updateOrCreate(
                ['code' => $attributes['code']],
                $attributes
            );
        }
    }
}
