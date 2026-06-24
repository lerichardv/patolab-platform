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
        Schema::table('invoice_group_specimens', function (Blueprint $table) {
            $table->string('selected_price')->nullable()->after('amount');
            $table->decimal('custom_specimen_price', 10, 2)->default(0.00)->after('selected_price');
            $table->boolean('additional_discount_enabled')->default(false)->after('discount');
            $table->decimal('additional_discount', 10, 2)->default(0.00)->after('additional_discount_enabled');
            $table->string('age_discount_type')->nullable()->after('additional_discount');
            $table->decimal('age_discount_amount', 10, 2)->default(0.00)->after('age_discount_type');
        });

        Schema::table('credit_invoice_specimens', function (Blueprint $table) {
            $table->string('selected_price')->nullable()->after('amount');
            $table->decimal('custom_specimen_price', 10, 2)->default(0.00)->after('selected_price');
            $table->boolean('additional_discount_enabled')->default(false)->after('discount');
            $table->decimal('additional_discount', 10, 2)->default(0.00)->after('additional_discount_enabled');
            $table->string('age_discount_type')->nullable()->after('additional_discount');
            $table->decimal('age_discount_amount', 10, 2)->default(0.00)->after('age_discount_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoice_group_specimens', function (Blueprint $table) {
            $table->dropColumn([
                'selected_price',
                'custom_specimen_price',
                'additional_discount_enabled',
                'additional_discount',
                'age_discount_type',
                'age_discount_amount',
            ]);
        });

        Schema::table('credit_invoice_specimens', function (Blueprint $table) {
            $table->dropColumn([
                'selected_price',
                'custom_specimen_price',
                'additional_discount_enabled',
                'additional_discount',
                'age_discount_type',
                'age_discount_amount',
            ]);
        });
    }
};
