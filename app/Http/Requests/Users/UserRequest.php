<?php

namespace App\Http\Requests\Users;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $isUpdate = $this->route('user');

        return $isUpdate
            ? ($this->user()?->can('update user') ?? false)
            : ($this->user()?->can('create user') ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->route('user');
        $isUpdate = $user !== null;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                $isUpdate ? 'unique:users,email,'.$user->id : 'unique:users,email',
            ],
            'password' => [
                $isUpdate ? 'nullable' : 'required',
                'string',
                'min:8',
                'confirmed',
            ],
            'role' => ['nullable', 'string', 'exists:roles,name'],
        ];
    }

    /**
     * Flash which modal to re-open on index after validation failure.
     */
    protected function failedValidation(Validator $validator): void
    {
        if ($this->routeIs('users.store')) {
            session()->flash('modal', 'create');
        } elseif ($this->routeIs('users.update')) {
            session()->flash('modal', 'edit');
            $user = $this->route('user');
            if ($user) {
                session()->flash('modal_user_id', $user->id);
            }
        }

        parent::failedValidation($validator);
    }
}
