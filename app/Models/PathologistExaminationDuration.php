<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Representa la duración estimada en minutos de un examen específico para un patólogo.
 */
class PathologistExaminationDuration extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'pathologist_examination_durations';

    protected $fillable = [
        'user_id',
        'specimen_type_examination_id',
        'duration_minutes',
    ];

    protected $casts = [
        'duration_minutes' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function examination(): BelongsTo
    {
        return $this->belongsTo(SpecimenTypeExamination::class, 'specimen_type_examination_id');
    }
}
