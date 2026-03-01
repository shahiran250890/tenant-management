<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    /**
     * Create the initial roles and permissions.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // create permissions
        Permission::create(['name' => 'add user']);
        Permission::create(['name' => 'edit user']);
        Permission::create(['name' => 'delete user']);
        Permission::create(['name' => 'view user']);
        Permission::create(['name' => 'add tenant']);
        Permission::create(['name' => 'edit tenant']);
        Permission::create(['name' => 'delete tenant']);
        Permission::create(['name' => 'view tenant']);

        // create roles and assign existing permissions
        $role1 = Role::create(['name' => 'superadmin']);
        $role1->givePermissionTo('add user');
        $role1->givePermissionTo('edit user');
        $role1->givePermissionTo('delete user');
        $role1->givePermissionTo('view user');
        $role1->givePermissionTo('add tenant');
        $role1->givePermissionTo('edit tenant');
        $role1->givePermissionTo('delete tenant');
        $role1->givePermissionTo('view tenant');

        $role2 = Role::create(['name' => 'admin']);
        $role2->givePermissionTo('add user');
        $role2->givePermissionTo('view user');
        $role2->givePermissionTo('add tenant');
        $role2->givePermissionTo('edit tenant');
        $role2->givePermissionTo('view tenant');

        // create demo users
        $user = \App\Models\User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'superadmin@example.com',
            'password' => Hash::make('password'),
        ]);
        $user->assignRole($role1);

        $user = \App\Models\User::factory()->create([
            'name' => 'System Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
        ]);
        $user->assignRole($role2);
    }
}
