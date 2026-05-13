<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Representa la relación entre un espécimen y los productos consumidos.
 */
class SpecimenProduct extends Pivot
{
    protected $table = 'specimen_products';

    protected $fillable = [
        'specimen',
        'product',
    ];
}
