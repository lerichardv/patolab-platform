<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Representa un precio en la lista de precios para productos o tipos de muestras.
 */
class PriceList extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'price_list';

    protected $fillable = [
        'pricing_source',
        'source_id',
        'amount',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    /**
     * Obtiene el modelo origen (producto o tipo de muestra) al que pertenece el precio.
     */
    public function source(): MorphTo
    {
        return $this->morphTo('source', 'pricing_source', 'source_id');
    }
}
