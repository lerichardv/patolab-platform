<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('invoice_specimens')
            ->where(function ($q) {
                $q->whereNull('selected_price')
                    ->orWhere('selected_price', '0')
                    ->orWhere('selected_price', '');
            })
            ->where('amount', '>', 0)
            ->update(['selected_price' => DB::raw('amount')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Non-destructive data population
    }
};
