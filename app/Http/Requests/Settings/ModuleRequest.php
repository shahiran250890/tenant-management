<?php

namespace App\Http\Requests\Settings;

use App\Models\Module;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ModuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $module = $this->route('module');

        return $module instanceof Module
            ? ($this->user()?->can('update module') ?? false)
            : ($this->user()?->can('create module') ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<int, string|Rule>|string>
     */
    public function rules(): array
    {
        $module = $this->route('module');

        return [
            'name' => ['required', 'string', 'max:255'],
            'key' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('modules', 'key')->ignore($module?->id),
            ],
            'is_enabled' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'key.regex' => 'The key must start with a lowercase letter and contain only lowercase letters, numbers and underscores.',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        if ($this->routeIs('settings.system.modules.store')) {
            session()->flash('modal', 'create');
        } elseif ($this->routeIs('settings.system.modules.update')) {
            session()->flash('modal', 'edit');
            $module = $this->route('module');
            if ($module instanceof Module) {
                session()->flash('modal_module_id', $module->id);
            }
        }

        parent::failedValidation($validator);
    }
}
