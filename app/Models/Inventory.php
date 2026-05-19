<?php

namespace App\Models;

use App\Traits\Auditable;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Representa la existencia de un producto en una bodega específica.
 */
class Inventory extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'inventory';

    protected $fillable = [
        'storage',
        'product',
        'quantity',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function storageRelation(): BelongsTo
    {
        return $this->belongsTo(Storage::class, 'storage');
    }

    public function productRelation(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product');
    }
}
