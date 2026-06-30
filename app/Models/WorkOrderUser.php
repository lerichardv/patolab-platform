<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class WorkOrderUser extends Pivot
{
    use Auditable;
    use HasFactory;

    public $incrementing = true;

    protected $table = 'work_orders_users';

    protected $fillable = [
        'work_order_id',
        'user_id',
    ];

    /**
     * Obtiene la orden de trabajo asociada.
     */
    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class, 'work_order_id');
    }

    /**
     * Obtiene el usuario/patólogo asociado.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
