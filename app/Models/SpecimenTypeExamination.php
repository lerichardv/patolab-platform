<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Representa un tipo específico de muestra o examen.
 */
class SpecimenTypeExamination extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'specimen_type_examination';

    protected $fillable = [
        'specimen_type',
        'name',
        'description',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function type(): BelongsTo
    {
        return $this->belongsTo(SpecimenType::class, 'specimen_type');
    }
}
