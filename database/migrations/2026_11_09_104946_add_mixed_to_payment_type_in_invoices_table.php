<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->enum('payment_type', ['cash', 'credit card', 'card', 'bank transfer', 'transfer', 'credit', 'check', 'n/a', 'mixed'])->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('invoices')->where('payment_type', 'mixed')->update(['payment_type' => 'cash']);

        Schema::table('invoices', function (Blueprint $table) {
            $table->enum('payment_type', ['cash', 'credit card', 'card', 'bank transfer', 'transfer', 'credit', 'check', 'n/a'])->change();
        });
    }
};
