<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpecimenTypeTemplate extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'specimen_type_templates';

    protected $fillable = [
        'specimen_type_id',
        'diagnosis_html',
        'macroscopy_html',
        'microscopy_html',
    ];

    public function specimenType(): BelongsTo
    {
        return $this->belongsTo(SpecimenType::class, 'specimen_type_id');
    }
}
