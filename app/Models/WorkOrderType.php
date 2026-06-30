<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkOrderType extends Model
{
    use Auditable;
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'name',
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

    /**
     * Obtiene las órdenes de trabajo asociadas a este tipo.
     */
    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class, 'work_order_type_id');
    }
}
