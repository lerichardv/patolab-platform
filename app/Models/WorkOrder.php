<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkOrder extends Model
{
    use Auditable;
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'specimen_id',
        'work_order_type_id',
        'user_id',
        'completed_by_id',
        'status',
        'priority',
        'comments',
        'due_date',
        'completed_at',
    ];

    protected $casts = [
        'priority' => 'integer',
        'due_date' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Obtiene el espécimen asociado a la orden de trabajo.
     */
    public function specimen(): BelongsTo
    {
        return $this->belongsTo(Specimen::class, 'specimen_id');
    }

    /**
     * Obtiene el tipo de orden de trabajo.
     */
    public function type(): BelongsTo
    {
        return $this->belongsTo(WorkOrderType::class, 'work_order_type_id', 'id');
    }

    /**
     * Obtiene el técnico asignado.
     */
    public function assignedTechnician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Obtiene el usuario que finalizó la orden.
     */
    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by_id');
    }

    /**
     * Obtiene los usuarios/patólogos asociados a la orden de trabajo.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'work_orders_users', 'work_order_id', 'user_id')
            ->using(WorkOrderUser::class)
            ->withTimestamps();
    }
}
