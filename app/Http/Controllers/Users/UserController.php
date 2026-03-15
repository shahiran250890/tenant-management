<?php

namespace App\Http\Controllers\Users;

use App\Concerns\HasResourcePermission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Users\UserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    use HasResourcePermission;

    public function __construct()
    {
        $this->registerResourcePermissionMiddleware();
    }

    protected function resourcePermissionName(): string
    {
        return 'user';
    }

    public function index(Request $request): Response
    {
        $users = User::with('roles')
            ->whereKeyNot(auth()->id())
            ->where('name', '!=', 'Super Admin')
            ->get();
        $roles = Role::orderBy('name')->pluck('name')->toArray();

        return Inertia::render('users/index', [
            'users' => $users,
            'roles' => $roles,
            'canAddUser' => auth()->user()->can('add user'),
            ...$this->resourcePermissionProps(),
            'openModalUserId' => $request->query('user_id') ? (int) $request->query('user_id') : null,
        ]);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('users.index', ['modal' => 'create']);
    }

    public function store(UserRequest $request): RedirectResponse
    {
        $validated = $request->safe()->only(['name', 'email', 'password', 'is_enabled']);
        if (! array_key_exists('is_enabled', $validated)) {
            $validated['is_enabled'] = true;
        }

        try {
            $user = User::create($validated);

            if ($request->filled('role')) {
                $user->assignRole($request->validated('role'));
            }
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('users.index', ['modal' => 'create'])
                ->with('error', 'Failed to create user. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('users.index')
            ->with('success', 'User created successfully.')
            ->with('success_key', now()->timestamp);
    }

    public function show(User $user): RedirectResponse
    {
        return redirect()->route('users.index', ['modal' => 'view', 'user_id' => $user->id]);
    }

    public function edit(User $user): RedirectResponse
    {
        return redirect()->route('users.index', ['modal' => 'edit', 'user_id' => $user->id]);
    }

    public function updateEnabled(Request $request, User $user): JsonResponse
    {
        $this->authorize('update user');

        $validated = $request->validate([
            'is_enabled' => ['required', 'boolean'],
        ]);

        $user->update(['is_enabled' => $validated['is_enabled']]);

        return response()->json(['is_enabled' => $user->is_enabled]);
    }

    public function update(UserRequest $request, User $user): RedirectResponse
    {
        $validated = $request->safe()->only(['name', 'email', 'is_enabled']);
        if ($request->filled('password')) {
            $validated['password'] = $request->validated('password');
        }

        try {
            $user->update($validated);

            if ($request->has('role')) {
                $user->syncRoles($request->filled('role') ? [$request->validated('role')] : []);
            }
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('users.index', ['modal' => 'edit', 'user_id' => $user->id])
                ->with('error', 'Failed to update user. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('users.index')
            ->with('success', 'User updated successfully.')
            ->with('success_key', now()->timestamp);
    }

    public function destroy(User $user): RedirectResponse
    {
        abort_unless(auth()->user()->can('delete user'), 403);

        try {
            $user->delete();
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('users.index')
                ->with('error', 'Failed to delete user. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('users.index')
            ->with('success', 'User deleted successfully.')
            ->with('success_key', now()->timestamp);
    }
}
