<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TenantDetail extends Model
{
    use HasFactory;

    protected $guarded = [
        'id',
        'tenant_id',
        'email',
        'phone',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
