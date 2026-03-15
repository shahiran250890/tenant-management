<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    /**
     * @var array<int, string>
     */
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
        ];
    }
}
