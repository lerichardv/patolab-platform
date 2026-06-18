<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class SpecimenGroup extends Model
{
    use Auditable;
    use HasFactory;

    protected $fillable = [
        'name',
        'invoice_id',
        'customer_id',
        'access_token',
    ];

    protected static function booted()
    {
        static::creating(function ($group) {
            if (empty($group->access_token)) {
                $group->access_token = Str::random(32);
            }
        });
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
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

    /**
     * Get the breakdown records for each specimen in this group.
     */
    public function invoiceGroupSpecimens(): HasMany
    {
        return $this->hasMany(InvoiceGroupSpecimen::class, 'group_id');
    }
}
