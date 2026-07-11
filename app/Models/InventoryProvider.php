<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Representa un proveedor de insumos del laboratorio.
 */
class InventoryProvider extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'inventory_providers';

    protected $fillable = [
        'name',
        'address',
        'email',
        'phone',
        'phone2',
    ];

    /**
     * Obtiene las órdenes de compra asociadas al proveedor.
     */
    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(InventoryPurchaseOrder::class, 'provider_id');
    }
}
