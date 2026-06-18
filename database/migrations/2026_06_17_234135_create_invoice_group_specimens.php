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
        Schema::create('invoice_group_specimens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->foreignId('group_id')->constrained('specimen_groups')->onDelete('cascade');
            $table->foreignId('specimen_id')->constrained('specimen')->onDelete('cascade');
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('exempt_amount', 10, 2)->default(0);
            $table->decimal('taxable_amount_15', 10, 2)->default(0);
            $table->decimal('taxable_amount_18', 10, 2)->default(0);
            $table->decimal('isv_15', 10, 2)->default(0);
            $table->decimal('isv_18', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_group_specimens');
    }
};
