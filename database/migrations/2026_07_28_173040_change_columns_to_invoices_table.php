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
        Schema::table('invoices', function (Blueprint $table) {
            $table->enum('payment_type', ['cash', 'credit card', 'bank transfer', 'credit', 'check', 'n/a'])->change();
            $table->enum('invoice_type', ['specimen', 'rental', 'credit payment', 'cancelled', 'social security'])->default('specimen')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('invoices')->where('payment_type', 'n/a')->update(['payment_type' => 'cash']);
        DB::table('invoices')->where('invoice_type', 'social security')->update(['invoice_type' => 'specimen']);

        Schema::table('invoices', function (Blueprint $table) {
            $table->enum('payment_type', ['cash', 'credit card', 'bank transfer', 'credit', 'check'])->change();
            $table->enum('invoice_type', ['specimen', 'rental', 'credit payment', 'cancelled'])->default('specimen')->change();

        });
    }
};
