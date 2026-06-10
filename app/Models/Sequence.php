<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Representa la secuencia de numeración para los especímenes.
 */
class Sequence extends Model
{
    use Auditable;
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'location_id',
        'specimen_type',
        'prefix',
        'separator',
        'fill',
        'month',
        'year',
        'current_sequence',
        'active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'active' => 'boolean',
    ];

    /**
     * Get the location that owns the sequence.
     */
    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    /**
     * Get the specimen type that owns the sequence.
     */
    public function specimenTypeRelation(): BelongsTo
    {
        // Table name is 'specimen_type' and foreign key is also 'specimen_type'
        return $this->belongsTo(SpecimenType::class, 'specimen_type');
    }
}
