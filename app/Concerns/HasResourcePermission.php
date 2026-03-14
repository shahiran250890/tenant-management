<?php

namespace App\Concerns;

use Illuminate\Support\Str;

trait HasResourcePermission
{
    /**
     * The resource name used for permission checks (e.g. 'role', 'permission', 'user').
     */
    abstract protected function resourcePermissionName(): string;

    /**
     * Register permission middleware for resource actions.
     * Call from the controller constructor.
     */
    protected function registerResourcePermissionMiddleware(): void
    {
        $resource = $this->resourcePermissionName();

        $this->middleware("permission:view {$resource}")->only(['index', 'show']);
        $this->middleware("permission:create {$resource}")->only(['create', 'store']);
        $this->middleware("permission:update {$resource}")->only(['edit', 'update']);
        $this->middleware("permission:delete {$resource}")->only(['destroy']);
    }

    /**
     * Abort with 403 if the user cannot perform the ability on the resource.
     *
     * @param  'view'|'create'|'update'|'delete'  $ability
     */
    protected function authorizeResourcePermission(string $ability): void
    {
        $permission = "{$ability} {$this->resourcePermissionName()}";

        abort_unless(auth()->user()?->can($permission), 403);
    }

    /**
     * Get the can* props for the resource to pass to Inertia.
     *
     * @return array{canView: bool, canCreate: bool, canUpdate: bool, canDelete: bool}
     */
    protected function resourcePermissionProps(): array
    {
        $resource = $this->resourcePermissionName();
        $studly = Str::studly($resource);

        return [
            "canView{$studly}" => auth()->user()?->can("view {$resource}") ?? false,
            "canCreate{$studly}" => auth()->user()?->can("create {$resource}") ?? false,
            "canUpdate{$studly}" => auth()->user()?->can("update {$resource}") ?? false,
            "canDelete{$studly}" => auth()->user()?->can("delete {$resource}") ?? false,
        ];
    }
}
