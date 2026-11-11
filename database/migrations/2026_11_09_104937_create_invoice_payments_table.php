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
        Schema::create('invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->enum('payment_method', ['cash', 'credit card', 'bank transfer', 'check']);
            $table->decimal('amount', 10, 2);
            $table->date('payment_date')->nullable();

            // Check
            $table->string('check_number', 100)->nullable();

            // Credit card
            $table->string('card_last_4', 10)->nullable();
            $table->string('card_expiration', 10)->nullable();
            $table->string('card_authorization_code', 100)->nullable();

            // Bank transfer
            $table->foreignId('transfer_bank_id')->nullable()->constrained('banks')->nullOnDelete();
            $table->string('transfer_authorization_code', 100)->nullable();

            // Proof of payment voucher path
            $table->string('proof_of_payment')->nullable();

            // User who recorded payment
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_payments');
    }
};
