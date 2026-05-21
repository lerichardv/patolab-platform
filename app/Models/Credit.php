<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Credit extends Model
{
    use Auditable;
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'credit_amount',
        'amount_paid',
        'amount_remaining',
    ];

    protected $casts = [
        'credit_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'amount_remaining' => 'decimal:2',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function invoices(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Invoice::class, 'credit_payment_id');
    }

    public function originalInvoice()
    {
        return $this->invoices()->where('payment_type', 'credit')->first();
    }
}
