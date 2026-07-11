<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Representa una orden de compra en el sistema de inventario.
 */
class InventoryPurchaseOrder extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'inventory_purchase_orders';

    protected $fillable = [
        'code',
        'provider_id',
        'requester_id',
        'date_requested',
        'date_delivered',
        'status',
        'purchase_order_file',
    ];

    protected $casts = [
        'date_requested' => 'datetime',
        'date_delivered' => 'datetime',
    ];

    /**
     * Obtiene el proveedor asociado a la orden de compra.
     */
    public function provider(): BelongsTo
    {
        return $this->belongsTo(InventoryProvider::class, 'provider_id');
    }

    /**
     * Obtiene el usuario que solicitó la orden de compra.
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    /**
     * Obtiene los productos asociados a la orden de compra.
     */
    public function products(): HasMany
    {
        return $this->hasMany(InventoryPurchaseOrderProduct::class, 'order_id');
    }
}
