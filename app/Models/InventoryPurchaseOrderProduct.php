<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Representa el detalle de un producto asociado a una orden de compra.
 */
class InventoryPurchaseOrderProduct extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'inventory_purchase_order_products';

    protected $fillable = [
        'order_id',
        'product_id',
        'specification',
        'quantity',
        'unit_price',
        'total_price',
    ];

    /**
     * Obtiene la orden de compra a la que pertenece este detalle.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(InventoryPurchaseOrder::class, 'order_id');
    }

    /**
     * Obtiene el producto asociado a este detalle de compra.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
