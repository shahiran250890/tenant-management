<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    use HasFactory;

    protected $guarded = [
        'id',
        'subscription_plan_id',
        'name',
        'host',
        'storage_domain',
        'database_name',
        'database_username',
        'database_password',
        'database_host',
        'database_port',
        'is_active',
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
