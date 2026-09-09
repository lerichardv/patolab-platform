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
        Schema::create('price_quote_specimens', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('price_quote_id');
            $table->string('specimen', 12);
            $table->unsignedBigInteger('specimen_type');
            $table->unsignedBigInteger('examination_id');
            $table->unsignedBigInteger('specimen_category');
            $table->integer('quantity');
            $table->decimal('amount', 10, 2);
            $table->decimal('discount', 10, 2);
            $table->decimal('subtotal', 10, 2);
            $table->decimal('exempt_amount', 10, 2);
            $table->decimal('taxable_amount_15', 10, 2);
            $table->decimal('taxable_amount_18', 10, 2);
            $table->decimal('isv_15', 10, 2);
            $table->decimal('isv_18', 10, 2);
            $table->decimal('total', 10, 2);
            $table->decimal('selected_price', 10, 2);
            $table->decimal('custom_specimen_price', 10, 2);
            $table->boolean('additional_discount_enabled')->default(false);
            $table->decimal('additional_discount', 10, 2);
            $table->string('age_discout_type', 10, 2);
            $table->decimal('age_discout_amount', 10, 2);
            $table->timestamps();

            // Foreigns
            $table->foreign('price_quote_id')->references('id')->on('price_quotes')->onDelete('cascade');
            $table->foreign('examination_id')->references('id')->on('specimen_type_examination')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('price_quote_specimens');
    }
};
