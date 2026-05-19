<?php

namespace App\Models;

use App\Traits\Auditable;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Representa un tipo de muestra o examen.
 */
class SpecimenType extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'specimen_type';

    protected $fillable = [
        'name',
        'description',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function examinations(): HasMany
    {
        return $this->hasMany(SpecimenTypeExamination::class, 'specimen_type_id');
    }
}
