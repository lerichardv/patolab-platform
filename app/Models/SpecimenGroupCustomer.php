<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpecimenGroupCustomer extends Model
{
    use Auditable;
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'specimen_group_id',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function specimenGroup(): BelongsTo
    {
        return $this->belongsTo(SpecimenGroup::class, 'specimen_group_id');
    }
}
