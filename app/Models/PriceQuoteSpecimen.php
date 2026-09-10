<?php

namespace App\Models;

use App\Services\SpecimenDeliveryDateService;
use App\Traits\Auditable;
use Database\Factories\PriceQuoteSpecimenFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Model representing 'price_quote_specimens' table.
 *
 * Desglose de exámenes y precios incluidos dentro de una cotización.
 *
 * @property int $id
 * @property int $price_quote_id
 * @property int $specimen_type
 * @property int $specimen_category
 * @property int $examination_id
 * @property int $quantity
 * @property string $amount
 * @property string $discount
 * @property string $subtotal
 * @property string $exempt_amount
 * @property string $taxable_amount_15
 * @property string $taxable_amount_18
 * @property string $isv_15
 * @property string $isv_18
 * @property string $total
 * @property string $selected_price
 * @property string $custom_specimen_price
 * @property bool $additional_discount_enabled
 * @property string $additional_discount
 * @property string $age_discout_type
 * @property string $age_discout_amount
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PriceQuoteSpecimen extends Model
{
    use Auditable;

    /** @use HasFactory<PriceQuoteSpecimenFactory> */
    use HasFactory;

    protected $table = 'price_quote_specimens';

    protected $fillable = [
        'price_quote_id',
        'specimen',
        'specimen_type',
        'specimen_category',
        'examination_id',
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
        'age_discout_type',
        'age_discout_amount',
    ];

    protected $casts = [
        'specimen' => 'string',
        'specimen_type' => 'integer',
        'specimen_category' => 'integer',
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
        'selected_price' => 'decimal:2',
        'custom_specimen_price' => 'decimal:2',
        'additional_discount_enabled' => 'boolean',
        'additional_discount' => 'decimal:2',
        'age_discout_amount' => 'decimal:2',
    ];

    protected $appends = [
        'specimen_type_id',
        'specimen_category_id',
    ];

    public function getSpecimenTypeIdAttribute(): int
    {
        return (int) $this->getRawOriginal('specimen_type');
    }

    public function getSpecimenCategoryIdAttribute(): int
    {
        return (int) $this->getRawOriginal('specimen_category');
    }

    /**
     * Get the price quote this specimen belongs to.
     */
    public function priceQuote(): BelongsTo
    {
        return $this->belongsTo(PriceQuote::class, 'price_quote_id');
    }

    /**
     * Get the examination catalog record associated with this quote item.
     */
    public function examination(): BelongsTo
    {
        return $this->belongsTo(SpecimenTypeExamination::class, 'examination_id');
    }

    /**
     * Get the specimen type associated with this quote item.
     */
    public function specimenType(): BelongsTo
    {
        return $this->belongsTo(SpecimenType::class, 'specimen_type');
    }

    /**
     * Get the specimen category associated with this quote item.
     */
    public function specimenCategory(): BelongsTo
    {
        return $this->belongsTo(SpecimenCategory::class, 'specimen_category');
    }

    /**
     * Get the estimated delivery date for this quote item based on its category.
     */
    public function getEstimatedDeliveryDateAttribute(): ?Carbon
    {
        $startDate = $this->priceQuote?->created_at ?? $this->created_at ?? now();

        return SpecimenDeliveryDateService::calculate($this->specimenCategory, $startDate);
    }
}
