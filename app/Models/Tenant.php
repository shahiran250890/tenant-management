<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'id',
        'name',
        'database',
        'status',
    ];

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * One tenant has many domains
     */
    public function domains()
    {
        return $this->hasMany(Domain::class);
    }
}
