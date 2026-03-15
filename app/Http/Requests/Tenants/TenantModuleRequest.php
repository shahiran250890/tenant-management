<?php

namespace App\Http\Requests\Tenants;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class TenantModuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update tenant') ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'modules' => ['present', 'array'],
            'modules.*.id' => ['required', 'integer', 'exists:modules,id'],
            'modules.*.is_enabled' => ['required', 'boolean'],
        ];
    }

    /**
     * Get sync array for tenant->modules()->sync(): [module_id => ['is_enabled' => bool], ...]
     *
     * @return array<int, array{is_enabled: bool}>
     */
    public function getSyncArray(): array
    {
        $sync = [];
        foreach ($this->validated('modules', []) as $item) {
            $sync[(int) $item['id']] = ['is_enabled' => (bool) $item['is_enabled']];
        }

        return $sync;
    }
}
