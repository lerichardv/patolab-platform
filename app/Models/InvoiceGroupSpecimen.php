<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model representing 'invoice_group_specimens' table.
 *
 * Purpose:
 * Stores the detailed breakdown (discounts, subtotals, taxes, and total) of each individual
 * specimen within a specimen group invoice, acting as a split invoice record per specimen.
 */
class InvoiceGroupSpecimen extends Model
{
    use HasFactory;

    protected $table = 'invoice_group_specimens';

    protected $fillable = [
        'invoice_id',
        'group_id',
        'specimen_id',
        'quantity',
        'amount',
        'discount',
        'subtotal',
        'exempt_amount',
        'taxable_amount_15',
        'taxable_amount_18',
        'isv_15',
        'isv_18',
        'total',
        'selected_price',
        'custom_specimen_price',
        'additional_discount_enabled',
        'additional_discount',
        'age_discount_type',
        'age_discount_amount',
    ];

    protected $casts = [
        'discount' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'exempt_amount' => 'decimal:2',
        'taxable_amount_15' => 'decimal:2',
        'taxable_amount_18' => 'decimal:2',
        'isv_15' => 'decimal:2',
        'isv_18' => 'decimal:2',
        'total' => 'decimal:2',
        'quantity' => 'integer',
        'amount' => 'decimal:2',
        'custom_specimen_price' => 'decimal:2',
        'additional_discount_enabled' => 'boolean',
        'additional_discount' => 'decimal:2',
        'age_discount_amount' => 'decimal:2',
    ];

    /**
     * Get the invoice associated with this split record.
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    /**
     * Get the specimen group associated with this split record.
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(SpecimenGroup::class, 'group_id');
    }

    /**
     * Get the specimen associated with this split record.
     */
    public function specimen(): BelongsTo
    {
        return $this->belongsTo(Specimen::class, 'specimen_id');
    }
}
