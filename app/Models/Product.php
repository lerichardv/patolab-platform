<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Representa un producto o insumo del laboratorio.
 */
class Product extends Model
{
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
}
