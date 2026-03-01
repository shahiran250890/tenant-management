<?php

namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use App\Http\Requests\Users\UserRequest;
use App\Models\User;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(\Illuminate\Http\Request $request): \Inertia\Response
    {
        $users = User::with('roles')->get();
        $roles = Role::orderBy('name')->pluck('name')->toArray();

        return Inertia::render('users/index', [
            'users' => $users,
            'roles' => $roles,
            'canAddUser' => auth()->user()->can('add user'),
            'canEditUser' => auth()->user()->can('edit user'),
            'canDeleteUser' => auth()->user()->can('delete user'),
            'canViewUser' => auth()->user()->can('view user'),
            'openModal' => $request->query('modal'),
            'openModalUserId' => $request->query('user_id') ? (int) $request->query('user_id') : null,
        ]);
    }

    public function create(): \Illuminate\Http\RedirectResponse
    {
        return redirect()->route('users.index', ['modal' => 'create']);
    }

    public function store(UserRequest $request): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->safe()->only(['name', 'email', 'password']);
        $user = User::create($validated);

        if ($request->filled('role')) {
            $user->assignRole($request->validated('role'));
        }

        return redirect()
            ->route('users.index')
            ->with('success', 'User created successfully.')
            ->with('success_key', now()->timestamp);
    }

    public function show(User $user): \Inertia\Response
    {
        $user->load('roles');

        return Inertia::render('users/view', [
            'user' => $user,
        ]);
    }

    public function edit(User $user): \Illuminate\Http\RedirectResponse
    {
        return redirect()->route('users.index', ['modal' => 'edit', 'user_id' => $user->id]);
    }

    public function update(UserRequest $request, User $user): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->safe()->only(['name', 'email']);
        if ($request->filled('password')) {
            $validated['password'] = $request->validated('password');
        }
        $user->update($validated);

        if ($request->has('role')) {
            $user->syncRoles($request->filled('role') ? [$request->validated('role')] : []);
        }

        return redirect()
            ->route('users.index')
            ->with('success', 'User updated successfully.')
            ->with('success_key', now()->timestamp);
    }

    public function destroy(User $user): \Illuminate\Http\RedirectResponse
    {
        abort_unless(auth()->user()->can('delete user'), 403);

        $user->delete();

        return redirect()
            ->route('users.index')
            ->with('success', 'User deleted successfully.')
            ->with('success_key', now()->timestamp);
    }
}
