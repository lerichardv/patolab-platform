<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SpecimenGroup extends Model
{
    use Auditable;
    use HasFactory;

    protected $fillable = [
        'name',
        'invoice_id',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function specimens(): HasMany
    {
        return $this->hasMany(Specimen::class, 'group_id');
    }

    public function customers(): BelongsToMany
    {
        return $this->belongsToMany(Customer::class, 'specimen_group_customers', 'specimen_group_id', 'customer_id')
            ->withTimestamps();
    }
}
