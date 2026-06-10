<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Representa una bodega o lugar de almacenamiento de productos.
 */
class Storage extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'storage';

    protected $fillable = [
        'name',
        'location',
        'description',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function inventory(): HasMany
    {
        return $this->hasMany(Inventory::class, 'storage');
    }
}
