<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'code_id',
    'specimen_id',
    'description',
    'number_of_cuttings',
    'cuttings_description',
    'number_of_slides',
    'cutting_slide_types',
    'status',
    'comments',
    'responsible_id',
])]
class Cutting extends Model
{
    protected function casts(): array
    {
        return [
            'number_of_cuttings' => 'integer',
            'number_of_slides' => 'integer',
            // NOTE: This JSON array stores IDs from App\Models\WorkOrderType,
            // as the table cutting_slide_types was deleted.
            'cutting_slide_types' => 'array',
        ];
    }

    public function code(): BelongsTo
    {
        return $this->belongsTo(CuttingCode::class, 'code_id');
    }

    public function specimen(): BelongsTo
    {
        return $this->belongsTo(Specimen::class, 'specimen_id');
    }

    public function responsible(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_id');
    }
}
