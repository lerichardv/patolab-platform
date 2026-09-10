<?php

namespace Database\Factories;

use App\Models\PriceQuote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PriceQuote>
 */
class PriceQuoteFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'price_quote_id' => strtoupper(bin2hex(random_bytes(6))),
            'customer_id' => null,
            'active' => true,
        ];
    }
}
