<?php

namespace App\Models;

use App\Casts\SectionsOrderCast;
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
        'specimen_type_examination_id',
        'clinical_details_html',
        'diagnosis_html',
        'macroscopy_html',
        'microscopy_html',
        'comments_notes_html',
        'protocols_html',
        'legend_html',
        'user_id',
        'sections_order',
    ];

    protected $casts = [
        /**
         * the sections order column will have a list of objects of this elements:
         * 1. clinical_details_html
         * 2. diagnosis_html
         * 3. macroscopy_html
         * 4. microscopy_html
         * 5. comments_notes_html
         * 6. protocols_html
         * 7. legend_html
         *
         * Each object will have this structure:
         * {
         * 	"key": "key_name",
         * 	"order": 1,
         * 	"active": true,
         * }
         *
         * The purpose of this column is to let the user order the sections on the report editor.
         */
        'sections_order' => SectionsOrderCast::class,
    ];

    public function specimenType(): BelongsTo
    {
        return $this->belongsTo(SpecimenType::class, 'specimen_type_id');
    }

    public function specimenTypeExamination(): BelongsTo
    {
        return $this->belongsTo(SpecimenTypeExamination::class, 'specimen_type_examination_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
