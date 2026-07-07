<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkOrderTask extends Model
{
    use Auditable;
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'duration_unit',
        'duration_value',
        'same_day_rule_enabled',
        'same_day_cutoff_start',
        'same_day_cutoff_end',
    ];

    protected $casts = [
        'same_day_rule_enabled' => 'boolean',
        'duration_value' => 'integer',
    ];
}
