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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('full_invoice_number')->unique();
            $table->string('invoice_number')->unique();
            $table->foreignId('cai_range_id')->constrained('cai_ranges')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('specimen_id')->constrained('specimen')->cascadeOnDelete();
            $table->enum('payment_type', ['cash', 'credit card', 'bank transfer', 'credit']);
            $table->integer('credit_payment_id')->nullable(); // required if payment type is credit
            $table->decimal('amount', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('exempt_amount', 10, 2)->default(0);
            $table->decimal('taxable_amount_15', 10, 2)->default(0);
            $table->decimal('taxable_amount_18', 10, 2)->default(0);
            $table->decimal('isv_15', 10, 2)->default(0);
            $table->decimal('isv_18', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            $table->text('proof_of_payment'); // the screen capture, picture or file of the payment made
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
