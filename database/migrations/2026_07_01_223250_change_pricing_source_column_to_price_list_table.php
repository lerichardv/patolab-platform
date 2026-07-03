<?php

use App\Models\PriceList;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('price_list', function (Blueprint $table) {
            $table->enum('pricing_source', ['product', 'specimen type', 'specimen type examination'])->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('price_list', function (Blueprint $table) {
            PriceList::where('pricing_source', 'specimen type examination')->delete();
            $table->enum('pricing_source', ['product', 'specimen type'])->change();
        });
    }
};
