<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SpecimenReport extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'specimen_reports';

    protected $fillable = [
        'report_date',
        'generated_at',
        'macroscopy_html',
        'macroscopy_finalization_datetime',
        'microscopy_html',
        'microscopy_finalization_datetime',
        'diagnosis_html',
        'report_finalization_datetime',
    ];

    protected $casts = [
        'report_date' => 'date',
        'generated_at' => 'datetime',
        'macroscopy_finalization_datetime' => 'datetime',
        'microscopy_finalization_datetime' => 'datetime',
        'report_finalization_datetime' => 'datetime',
    ];

    protected $hidden = [
        'yjs_macroscopy_state',
        'yjs_microscopy_state',
        'yjs_diagnosis_state',
        'yjs_report_date_state',
    ];

    /**
     * Get the specimens associated with this report.
     */
    public function specimens(): HasMany
    {
        return $this->hasMany(Specimen::class, 'report_id');
    }
}
