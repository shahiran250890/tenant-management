<?php

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $isUpdate = $this->route('role');

        return $isUpdate
            ? ($this->user()?->can('update role') ?? false)
            : ($this->user()?->can('create role') ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<int, string|Rule>|string>
     */
    public function rules(): array
    {
        $role = $this->route('role');
        $guard = config('auth.defaults.guard', 'web');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('roles', 'name')
                    ->where('guard_name', $guard)
                    ->ignore($role?->id),
            ],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        if ($this->routeIs('settings.system.roles.store')) {
            session()->flash('modal', 'create');
        } elseif ($this->routeIs('settings.system.roles.update')) {
            session()->flash('modal', 'edit');
            $role = $this->route('role');
            if ($role) {
                session()->flash('modal_role_id', $role->id);
            }
        }

        parent::failedValidation($validator);
    }
}
