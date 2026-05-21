<?php

namespace App\Models;

use App\Traits\Auditable;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Representa un producto o insumo del laboratorio.
 */
class Product extends Model
{
    use Auditable;
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
        'unit',
        'unit_value',
        'purchase_price',
        'sale_price',
        'isv',
        'active',
    ];

    protected $casts = [
        'isv' => 'boolean',
        'active' => 'boolean',
    ];

    /**
     * Set the product's code to uppercase.
     */
    public function setCodeAttribute($value)
    {
        $this->attributes['code'] = strtoupper($value);
    }

    public function inventory(): HasMany
    {
        return $this->hasMany(Inventory::class, 'product');
    }

    public function prices(): MorphMany
    {
        return $this->morphMany(PriceList::class, 'source', 'pricing_source', 'source_id');
    }
}
