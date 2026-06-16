<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model representing 'credit_invoice_specimens' table.
 *
 * Purpose:
 * This model/table holds the specimens that correspond to a credit and an invoice.
 * It stores the exact values (amounts, discounts, totals) charged for each specimen
 * on a grouped credit at the time of creation.
 *
 * Tracking:
 * The 'is_paid' column tracks payment status per specimen in grouped credits.
 * On the credit payment form, this allows the user to select specific specimens
 * to pay, making partial payments for the customer.
 */
class CreditInvoiceSpecimen extends Model
{
    use HasFactory;

    protected $table = 'credit_invoice_specimens';

    protected $fillable = [
        'credit_id',
        'invoice_id',
        'specimen_id',
        'is_paid',
        'amount',
        'discount',
        'subtotal',
        'exempt_amount',
        'taxable_amount_15',
        'taxable_amount_18',
        'isv_15',
        'isv_18',
        'total',
    ];

    protected $casts = [
        'is_paid' => 'boolean',
        'amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'exempt_amount' => 'decimal:2',
        'taxable_amount_15' => 'decimal:2',
        'taxable_amount_18' => 'decimal:2',
        'isv_15' => 'decimal:2',
        'isv_18' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    /**
     * Get the credit associated with this record.
     */
    public function credit(): BelongsTo
    {
        return $this->belongsTo(Credit::class, 'credit_id');
    }

    /**
     * Get the invoice associated with this record.
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    /**
     * Get the specimen associated with this record.
     */
    public function specimen(): BelongsTo
    {
        return $this->belongsTo(Specimen::class, 'specimen_id');
    }
}
