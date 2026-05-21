<?php

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
        Schema::create('price_list', function (Blueprint $table) {
            $table->id();
            $table->enum('pricing_source', ['product', 'specimen type']);
            $table->integer('source_id')->index();
            $table->decimal('amount', 10, 2);
            $table->timestamps();

            $table->index(['pricing_source', 'source_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('price_list');
    }
};
