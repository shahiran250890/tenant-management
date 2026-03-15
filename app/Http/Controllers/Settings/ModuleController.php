<?php

namespace App\Http\Controllers\Settings;

use App\Concerns\HasResourcePermission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ModuleRequest;
use App\Models\Module;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ModuleController extends Controller
{
    use HasResourcePermission;

    public function __construct()
    {
        $this->registerResourcePermissionMiddleware();
    }

    protected function resourcePermissionName(): string
    {
        return 'module';
    }

    public function index(Request $request): Response
    {
        $modules = Module::query()->orderBy('name')->get();

        return Inertia::render('settings/system/modules/index', [
            'modules' => $modules,
            ...$this->resourcePermissionProps(),
            'openModal' => $request->query('modal'),
            'openModalModuleId' => $request->query('module_id') ? (int) $request->query('module_id') : null,
        ]);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('settings.system.modules.index', ['modal' => 'create']);
    }

    public function store(ModuleRequest $request): RedirectResponse
    {
        try {
            Module::create($request->validated());
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('settings.system.modules.index', ['modal' => 'create'])
                ->with('error', 'Failed to create module. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('settings.system.modules.index')
            ->with('success', 'Module created successfully.')
            ->with('success_key', now()->timestamp);
    }

    public function show(Module $module): RedirectResponse
    {
        return redirect()->route('settings.system.modules.index', ['modal' => 'view', 'module_id' => $module->id]);
    }

    public function edit(Module $module): RedirectResponse
    {
        return redirect()->route('settings.system.modules.index', ['modal' => 'edit', 'module_id' => $module->id]);
    }

    public function update(ModuleRequest $request, Module $module): RedirectResponse
    {
        try {
            $module->update($request->validated());
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('settings.system.modules.index', ['modal' => 'edit', 'module_id' => $module->id])
                ->with('error', 'Failed to update module. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('settings.system.modules.index')
            ->with('success', 'Module updated successfully.')
            ->with('success_key', now()->timestamp);
    }

    public function destroy(Module $module): RedirectResponse
    {
        abort_unless(auth()->user()->can('delete module'), 403);

        try {
            $module->delete();
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('settings.system.modules.index')
                ->with('error', 'Failed to delete module. Please try again.')
                ->with('error_key', now()->timestamp);
        }

        return redirect()
            ->route('settings.system.modules.index')
            ->with('success', 'Module deleted successfully.')
            ->with('success_key', now()->timestamp);
    }
}
