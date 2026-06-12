<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Carbon\CarbonInterval;

class Credit extends Model
{
    use Auditable;
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'credit_amount',
        'amount_paid',
        'amount_remaining',
        'specimen_id',
        'is_group',
        'group_id',
        'last_payment_date',
        'reminder_interval_in_seconds',
    ];

    protected $casts = [
        'credit_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'amount_remaining' => 'decimal:2',
        'is_group' => 'boolean',
        'specimen_id' => 'integer',
        'group_id' => 'integer',
        'last_payment_date' => 'datetime',
        'reminder_interval_in_seconds' => 'integer',
    ];

    /**
     * Intercept the attribute to work with CarbonInterval directly.
     */
    protected function reminderInterval(): Attribute
    {
        return Attribute::make(
            get: fn (mixed $value, array $attributes) => CarbonInterval::seconds($attributes['reminder_interval_in_seconds'] ?? 604800),
            set: fn (CarbonInterval $value) => ['reminder_interval_in_seconds' => $value->totalSeconds],
        );
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function specimen(): BelongsTo
    {
        return $this->belongsTo(Specimen::class, 'specimen_id');
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(SpecimenGroup::class, 'group_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'credit_payment_id');
    }

    public function originalInvoice()
    {
        return $this->invoices()->where('payment_type', 'credit')->first();
    }
}
