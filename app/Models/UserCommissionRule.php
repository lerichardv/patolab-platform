<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Representa una regla de comisión para un patólogo en un tipo de estudio y examen.
 */
class UserCommissionRule extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'user_commission_rules';

    protected $fillable = [
        'user_id',
        'specimen_type_id',
        'specimen_type_examination_id',
        'macroscopy_commission_enabled',
        'macroscopy_calculation_type',
        'macroscopy_commission_value',
        'microscopy_commission_enabled',
        'microscopy_calculation_type',
        'microscopy_commission_value',
    ];

    protected $casts = [
        'macroscopy_commission_enabled' => 'boolean',
        'microscopy_commission_enabled' => 'boolean',
        'macroscopy_commission_value' => 'decimal:2',
        'microscopy_commission_value' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function specimenType(): BelongsTo
    {
        return $this->belongsTo(SpecimenType::class, 'specimen_type_id');
    }

    public function specimenTypeExamination(): BelongsTo
    {
        return $this->belongsTo(SpecimenTypeExamination::class, 'specimen_type_examination_id');
    }

    public function commissions(): HasMany
    {
        return $this->hasMany(UserCommission::class, 'user_commission_rule_id');
    }
}
