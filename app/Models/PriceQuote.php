<?php

namespace App\Models;

use App\Traits\Auditable;
use Database\Factories\PriceQuoteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * Model representing 'price_quotes' table.
 *
 * Cotizaciones previas para especímenes y exámenes solicitados por clientes.
 *
 * @property int $id
 * @property string $price_quote_id 12-character hex identifier
 * @property int|null $customer_id
 * @property string|null $price_quote_file
 * @property bool $active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read string|null $price_quote_url
 * @property-read float $total
 */
class PriceQuote extends Model
{
    use Auditable;

    /** @use HasFactory<PriceQuoteFactory> */
    use HasFactory;

    protected $table = 'price_quotes';

    protected $fillable = [
        'price_quote_id',
        'customer_id',
        'price_quote_file',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    protected $appends = [
        'price_quote_url',
        'total',
    ];

    /**
     * Ensure price_quote_id is always stored in uppercase.
     */
    public function setPriceQuoteIdAttribute(string $value): void
    {
        $this->attributes['price_quote_id'] = strtoupper($value);
    }

    /**
     * Get the customer associated with the price quote.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    /**
     * Get the specimen items associated with the price quote.
     */
    public function priceQuoteSpecimens(): HasMany
    {
        return $this->hasMany(PriceQuoteSpecimen::class, 'price_quote_id');
    }

    /**
     * Alias for priceQuoteSpecimens.
     */
    public function specimens(): HasMany
    {
        return $this->priceQuoteSpecimens();
    }

    /**
     * Get the URL for the price quote PDF.
     */
    public function getPriceQuoteUrlAttribute(): ?string
    {
        if (! $this->price_quote_file) {
            return null;
        }

        return Storage::disk('public')->url($this->price_quote_file);
    }

    /**
     * Get the total amount of all specimen items.
     */
    public function getTotalAttribute(): float
    {
        return (float) $this->priceQuoteSpecimens->sum('total');
    }
}
