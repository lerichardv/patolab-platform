<?php

namespace App\Models;

use App\Traits\Auditable;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Representa un movimiento o cambio en el inventario de un producto.
 */
class InventoryMovement extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'inventory_movements';

    protected $fillable = [
        'inventory_name',
        'inventory',
        'storage_name',
        'storage',
        'quantity_added',
        'quantity_before_update',
        'quantity_after_update',
        'movement',
        'user_id',
    ];

    protected $casts = [
        'quantity_added' => 'integer',
        'quantity_before_update' => 'integer',
        'quantity_after_update' => 'integer',
    ];

    public function inventoryRelation(): BelongsTo
    {
        return $this->belongsTo(Inventory::class, 'inventory');
    }

    public function storageRelation(): BelongsTo
    {
        return $this->belongsTo(Storage::class, 'storage');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
