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
        Schema::create('invoice_specimens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->foreignId('specimen_id')->constrained('specimen')->onDelete('cascade');
            $table->boolean('is_group')->default(false);
            $table->foreignId('group_id')->nullable()->constrained('specimen_groups')->onDelete('set null');
            $table->foreignId('credit_id')->nullable()->constrained('credits')->onDelete('set null');
            $table->boolean('is_paid')->default(false);
            $table->integer('quantity_paid')->default(0);
            $table->integer('quantity')->default(1);
            $table->decimal('amount', 10, 2)->default(0.00);
            $table->decimal('discount', 10, 2)->default(0.00);
            $table->decimal('subtotal', 10, 2)->default(0.00);
            $table->decimal('exempt_amount', 10, 2)->default(0.00);
            $table->decimal('taxable_amount_15', 10, 2)->default(0.00);
            $table->decimal('taxable_amount_18', 10, 2)->default(0.00);
            $table->decimal('isv_15', 10, 2)->default(0.00);
            $table->decimal('isv_18', 10, 2)->default(0.00);
            $table->decimal('total', 10, 2)->default(0.00);
            $table->string('selected_price')->nullable();
            $table->decimal('custom_specimen_price', 10, 2)->default(0.00);
            $table->boolean('additional_discount_enabled')->default(false);
            $table->decimal('additional_discount', 10, 2)->default(0.00);
            $table->string('age_discount_type')->nullable();
            $table->decimal('age_discount_amount', 10, 2)->default(0.00);
            $table->timestamps();

            $table->index(['invoice_id', 'specimen_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_specimens');
    }
};
