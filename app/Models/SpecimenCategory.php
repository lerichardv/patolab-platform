<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Representa una categoría de espécimen (ej: Urgente, Rutina) con sus tiempos de entrega.
 */
class SpecimenCategory extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'specimen_category';

    protected $fillable = [
        'name',
        'unit',
        'quantity',
        'intern_unit',
        'intern_quantity',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
        'quantity' => 'integer',
        'intern_quantity' => 'integer',
    ];

    public function specimens(): HasMany
    {
        return $this->hasMany(Specimen::class, 'specimen_category');
    }
}
