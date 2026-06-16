<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Purpose of the table 'credit_invoice_specimens':
     * This table maps specimens to credits and invoices in grouped credit operations.
     * It stores the exact amounts, discounts, and total charged for each specimen at checkout.
     * The 'is_paid' column tracks payment status per specimen, allowing the client to select
     * individual specimens to pay in partial payments rather than paying one bulk sum.
     */
    public function up(): void
    {
        Schema::create('credit_invoice_specimens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('credit_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('specimen_id')->constrained('specimen')->cascadeOnDelete();
            $table->boolean('is_paid')->default(0);
            $table->decimal('amount', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('exempt_amount', 10, 2)->default(0);
            $table->decimal('taxable_amount_15', 10, 2)->default(0);
            $table->decimal('taxable_amount_18', 10, 2)->default(0);
            $table->decimal('isv_15', 10, 2)->default(0);
            $table->decimal('isv_18', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);

            // Ensure unique mapping of credit, invoice, and specimen
            $table->unique(['credit_id', 'invoice_id', 'specimen_id'], 'credit_invoice_specimen_unique');
            $table->timestamps();
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('credit_invoice_specimens');
    }
};
