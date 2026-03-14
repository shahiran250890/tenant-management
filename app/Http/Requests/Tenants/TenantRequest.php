<?php

namespace App\Http\Requests\Tenants;

use App\Models\Tenant;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
     * @return array<string, ValidationRule|array<int, ValidationRule|string>|string>
     */
    public function rules(): array
    {
        $tenant = $this->route('tenant');
        $hostUnique = Rule::unique('domains', 'domain');
        if ($tenant instanceof Tenant) {
            $hostUnique->where(fn ($query) => $query->where('tenant_id', '!=', $tenant->id));
        }

        $hostItemRules = [
            'nullable',
            'string',
            'max:255',
            'regex:/^([a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?)?$/',
            function (string $attribute, mixed $value, \Closure $fail) {
                if ($value !== '' && $value !== null && ! str_contains((string) $value, '.')) {
                    $fail('Each host must be a valid domain with at least one dot (e.g. example.com).');
                }
            },
            $hostUnique,
        ];

        return [
            'name' => ['required', 'string', 'max:255'],
            'hosts' => ['array'],
            'hosts.*' => $hostItemRules,
            'storage_domain' => ['nullable', 'string', 'max:255'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $hosts = $this->input('hosts', []);
            $filled = array_values(array_filter(array_map('strval', $hosts)));
            if (count($filled) !== count(array_unique($filled))) {
                $validator->errors()->add('hosts', 'Duplicate hosts are not allowed.');
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'hosts.*.regex' => 'Each host must be a valid hostname (letters, numbers, dots and hyphens only).',
            'hosts.*.unique' => 'This host is already in use by another tenant.',
        ];
    }
}
