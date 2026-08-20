<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model representing 'invoice_specimens' table.
 *
 * Stores the breakdown details (discounts, subtotals, taxes, and total) of each individual
 * specimen within an invoice, serving individual, group, and credit invoices.
 */
class InvoiceSpecimen extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'invoice_specimens';

    protected static function booted()
    {
        static::creating(function ($model) {
            if ($model->invoice_id && $model->specimen_id) {
                $existing = static::where('invoice_id', $model->invoice_id)
                    ->where('specimen_id', $model->specimen_id)
                    ->first();

                if ($existing) {
                    $attrs = array_filter($model->getAttributes(), fn ($val) => ! is_null($val));
                    $existing->update($attrs);

                    return false;
                }
            }
        });
    }

    protected $fillable = [
        'invoice_id',
        'specimen_id',
        'is_group',
        'group_id',
        'credit_id',
        'is_paid',
        'quantity_paid',
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
        'is_group' => 'boolean',
        'is_paid' => 'boolean',
        'quantity_paid' => 'integer',
        'quantity' => 'integer',
        'amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'exempt_amount' => 'decimal:2',
        'taxable_amount_15' => 'decimal:2',
        'taxable_amount_18' => 'decimal:2',
        'isv_15' => 'decimal:2',
        'isv_18' => 'decimal:2',
        'total' => 'decimal:2',
        'custom_specimen_price' => 'decimal:2',
        'additional_discount_enabled' => 'boolean',
        'additional_discount' => 'decimal:2',
        'age_discount_amount' => 'decimal:2',
    ];

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

    /**
     * Get the specimen group associated with this record (if group invoice).
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(SpecimenGroup::class, 'group_id');
    }

    /**
     * Get the credit associated with this record (if credit invoice).
     */
    public function credit(): BelongsTo
    {
        return $this->belongsTo(Credit::class, 'credit_id');
    }
}
