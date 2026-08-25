<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model representing pivot table 'specimen_examinations'.
 * Links a specimen to multiple analysis types (examinations).
 */
class SpecimenExamination extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'specimen_examinations';

    protected $fillable = [
        'specimen_id',
        'examination_id',
    ];

    public function specimen(): BelongsTo
    {
        return $this->belongsTo(Specimen::class, 'specimen_id');
    }

    public function examination(): BelongsTo
    {
        return $this->belongsTo(SpecimenTypeExamination::class, 'examination_id');
    }
}
