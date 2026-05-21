<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    use Auditable;
    use HasFactory;

    protected $fillable = [
        'full_invoice_number',
        'invoice_number',
        'cai_range_id',
        'customer_id',
        'specimen_id',
        'payment_type',
        'credit_payment_id',
        'amount',
        'discount',
        'subtotal',
        'exempt_amount',
        'tax_exempt_amount',
        'taxable_amount_15',
        'taxable_amount_18',
        'isv_15',
        'isv_18',
        'total',
        'proof_of_payment',
        'invoice_file',
        'custom_amount',
        'custom_amount_reason'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'exempt_amount' => 'decimal:2',
        'tax_exempt_amount' => 'decimal:2',
        'taxable_amount_15' => 'decimal:2',
        'taxable_amount_18' => 'decimal:2',
        'isv_15' => 'decimal:2',
        'isv_18' => 'decimal:2',
        'total' => 'decimal:2',
        'custom_amount' => 'decimal:2',
    ];

    public function caiRange(): BelongsTo
    {
        return $this->belongsTo(CaiRange::class, 'cai_range_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function specimen(): BelongsTo
    {
        return $this->belongsTo(Specimen::class, 'specimen_id');
    }

    public function creditRelation(): BelongsTo
    {
        return $this->belongsTo(Credit::class, 'credit_payment_id');
    }
}
