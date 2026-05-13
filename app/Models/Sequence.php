<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Representa la secuencia de numeración para los especímenes.
 */
class Sequence extends Model
{
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
