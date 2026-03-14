<?php

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PermissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $isUpdate = $this->route('permission');

        return $isUpdate
            ? ($this->user()?->can('update permission') ?? false)
            : ($this->user()?->can('create permission') ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<int, string|Rule>|string>
     */
    public function rules(): array
    {
        $permission = $this->route('permission');
        $guard = config('auth.defaults.guard', 'web');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('permissions', 'name')
                    ->where('guard_name', $guard)
                    ->ignore($permission?->id),
            ],
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        if ($this->routeIs('settings.system.permissions.store')) {
            session()->flash('modal', 'create');
        } elseif ($this->routeIs('settings.system.permissions.update')) {
            session()->flash('modal', 'edit');
            $permission = $this->route('permission');
            if ($permission) {
                session()->flash('modal_permission_id', $permission->id);
            }
        }

        parent::failedValidation($validator);
    }
}
