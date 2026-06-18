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
            $table->integer('quantity')->default(0)->after('credit_payment_id');
        });
        Schema::table('invoice_group_specimens', function (Blueprint $table) {
            $table->integer('quantity')->default(0)->after('specimen_id');
            $table->decimal('amount', 10, 2)->default(0.00)->after('specimen_id');
        });
        Schema::table('credit_invoice_specimens', function (Blueprint $table) {
            $table->integer('quantity')->default(0)->after('is_paid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('quantity');
        });
        Schema::table('invoice_group_specimens', function (Blueprint $table) {
            $table->dropColumn('quantity');
            $table->dropColumn('amount');
        });
        Schema::table('credit_invoice_specimens', function (Blueprint $table) {
            $table->dropColumn('quantity');
        });
    }
};
