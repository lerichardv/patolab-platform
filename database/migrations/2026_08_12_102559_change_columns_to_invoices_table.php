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
            $table->string('full_invoice_number')->nullable()->change();
            $table->string('invoice_number')->nullable()->change();
            $table->foreignId('cai_range_id')->nullable()->change();
            $table->text('proof_of_payment')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('full_invoice_number')->nullable(false)->change();
            $table->string('invoice_number')->nullable(false)->change();
            $table->foreignId('cai_range_id')->nullable(false)->change();
            $table->text('proof_of_payment')->nullable(false)->change();
        });
    }
};
