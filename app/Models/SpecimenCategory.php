<?php

namespace App\Models;

use App\Services\SpecimenDeliveryDateService;
use App\Traits\Auditable;
use Carbon\Carbon;
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

    /**
     * Calculate estimated delivery date based on category duration.
     */
    public function calculateEstimatedDeliveryDate(Carbon|string|null $startDate = null): ?Carbon
    {
        return SpecimenDeliveryDateService::calculate($this, $startDate);
    }

    /**
     * Get human-readable delivery duration string (e.g. "1 día", "10 días", "2 semanas").
     */
    public function getFormattedDeliveryDurationAttribute(): ?string
    {
        if ($this->quantity === null || empty($this->unit)) {
            return null;
        }

        $qty = (int) $this->quantity;
        $unit = strtolower((string) $this->unit);

        $unitLabel = match ($unit) {
            'minute', 'minutes' => $qty === 1 ? 'minuto' : 'minutos',
            'hour', 'hours' => $qty === 1 ? 'hora' : 'horas',
            'day', 'days' => $qty === 1 ? 'día' : 'días',
            'week', 'weeks' => $qty === 1 ? 'semana' : 'semanas',
            'month', 'months' => $qty === 1 ? 'mes' : 'meses',
            default => $qty === 1 ? $unit : $unit.'s',
        };

        return "{$qty} {$unitLabel}";
    }
}
