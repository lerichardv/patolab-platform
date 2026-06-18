<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Representa una comisión calculada y asignada a un patólogo por un caso en una fase específica.
 */
class UserCommission extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'user_commissions';

    protected $fillable = [
        'user_id',
        'specimen_id',
        'user_commission_rule_id',
        'phase',
        'specimen_base_amount',
        'calculated_comission_amount',
        'user_commission_rule_applied',
        'status',
        'paid_at',
        'created_by',
        'updated_by',
        'paid_by',
    ];

    protected $casts = [
        'user_commission_rule_applied' => 'array',
        'specimen_base_amount' => 'decimal:2',
        'calculated_comission_amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function specimen(): BelongsTo
    {
        return $this->belongsTo(Specimen::class, 'specimen_id');
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(UserCommissionRule::class, 'user_commission_rule_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }
}
