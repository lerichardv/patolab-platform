<?php

namespace Database\Factories;

use App\Models\PriceQuoteSpecimen;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PriceQuoteSpecimen>
 */
class PriceQuoteSpecimenFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'price_quote_id' => PriceQuote::factory(),
            'specimen' => fake()->regexify('[0-9a-f]{12}'),
            'specimen_type' => 1,
            'specimen_category' => 1,
            'examination_id' => 1,
            'quantity' => 1,
            'amount' => 100.00,
            'discount' => 0.00,
            'subtotal' => 100.00,
            'exempt_amount' => 0.00,
            'taxable_amount_15' => 100.00,
            'taxable_amount_18' => 0.00,
            'isv_15' => 15.00,
            'isv_18' => 0.00,
            'total' => 115.00,
            'selected_price' => 100.00,
            'custom_specimen_price' => 0.00,
            'additional_discount_enabled' => false,
            'additional_discount' => 0.00,
            'age_discout_type' => 'percentage',
            'age_discout_amount' => 0.00,
        ];
    }
}
