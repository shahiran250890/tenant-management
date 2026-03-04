<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    use HasFactory, HasUuids;

    /**
     * Only guard id and subscription_plan_id so create/update can set the rest.
     *
     * @var array<int, string>
     */
    protected $guarded = [
        'id',
        'subscription_plan_id',
    ];

    public $incrementing = false;

    protected $keyType = 'string';

    protected function casts(): array
    {
        return [
            'database_username' => 'encrypted',
            'database_password' => 'encrypted',
        ];
    }

    /**
     * One tenant has many domains
     */
    public function domains()
    {
        return $this->hasMany(Domain::class);
    }
}
