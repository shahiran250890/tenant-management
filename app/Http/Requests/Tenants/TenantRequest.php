<?php

namespace App\Http\Requests\Tenants;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class TenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        $isUpdate = $this->route('tenant');

        return $isUpdate
            ? ($this->user()?->can('update tenant') ?? false)
            : ($this->user()?->can('create tenant') ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<int, string>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'host' => ['nullable', 'string', 'max:255'],
            'storage_domain' => ['nullable', 'string', 'max:255'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
