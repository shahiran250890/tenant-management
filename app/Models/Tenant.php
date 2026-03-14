<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    /**
     * @var array<int, string>
     */
    protected $appends = ['host'];

    protected function casts(): array
    {
        return [
            'database_username' => 'encrypted',
            'database_password' => 'encrypted',
        ];
    }

    /**
     * One tenant has many domains.
     */
    public function domains(): HasMany
    {
        return $this->hasMany(Domain::class);
    }

    /**
     * Host is stored in the domains table (first domain).
     */
    protected function host(): Attribute
    {
        return Attribute::get(
            fn (): ?string => $this->domains->first()?->domain
        );
    }

    /**
     * Many tenants can have many modules.
     */
    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(Module::class, 'module_tenant')
            ->withPivot('is_enabled')
            ->withTimestamps();
    }
}
