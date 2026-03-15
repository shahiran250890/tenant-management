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
        Permission::create(['name' => 'create user']);
        Permission::create(['name' => 'update user']);
        Permission::create(['name' => 'delete user']);
        Permission::create(['name' => 'view user']);
        Permission::create(['name' => 'create tenant']);
        Permission::create(['name' => 'update tenant']);
        Permission::create(['name' => 'delete tenant']);
        Permission::create(['name' => 'view tenant']);
        Permission::create(['name' => 'create role']);
        Permission::create(['name' => 'update role']);
        Permission::create(['name' => 'delete role']);
        Permission::create(['name' => 'view role']);
        Permission::create(['name' => 'create permission']);
        Permission::create(['name' => 'update permission']);
        Permission::create(['name' => 'delete permission']);
        Permission::create(['name' => 'view permission']);
        Permission::create(['name' => 'create module']);
        Permission::create(['name' => 'update module']);
        Permission::create(['name' => 'delete module']);
        Permission::create(['name' => 'view module']);

        // create roles and assign existing permissions
        $role1 = Role::create(['name' => 'superadmin']);
        $role1->givePermissionTo('create permission');
        $role1->givePermissionTo('update permission');
        $role1->givePermissionTo('delete permission');
        $role1->givePermissionTo('view permission');
        $role1->givePermissionTo('create role');
        $role1->givePermissionTo('update role');
        $role1->givePermissionTo('delete role');
        $role1->givePermissionTo('view role');
        $role1->givePermissionTo('create user');
        $role1->givePermissionTo('update user');
        $role1->givePermissionTo('delete user');
        $role1->givePermissionTo('view user');
        $role1->givePermissionTo('create tenant');
        $role1->givePermissionTo('update tenant');
        $role1->givePermissionTo('delete tenant');
        $role1->givePermissionTo('view tenant');
        $role1->givePermissionTo('create module');
        $role1->givePermissionTo('update module');
        $role1->givePermissionTo('delete module');
        $role1->givePermissionTo('view module');

        $role2 = Role::create(['name' => 'admin']);
        $role2->givePermissionTo('create user');
        $role2->givePermissionTo('view user');
        $role2->givePermissionTo('create tenant');
        $role2->givePermissionTo('update tenant');
        $role2->givePermissionTo('view tenant');

        // create demo users
        $user = \App\Models\User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'superadmin@example.com',
            'password' => Hash::make('password'),
            'is_enabled' => true,
        ]);
        $user->assignRole($role1);

        $user = \App\Models\User::factory()->create([
            'name' => 'System Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'is_enabled' => true,
        ]);
        $user->assignRole($role2);
    }
}
