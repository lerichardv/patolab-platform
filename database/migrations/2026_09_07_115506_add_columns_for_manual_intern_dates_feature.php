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
        Schema::table('specimen', function (Blueprint $table) {
            $table->boolean('is_manual_delivery_date_intern_enabled')->after('sequence_code')->default(false);
            $table->enum('delivery_date_intern_unit', ['minutes', 'hours', 'days', 'weeks'])->after('is_manual_delivery_date_intern_enabled')->default('minutes');
            $table->integer('delivery_date_intern_quantity')->after('delivery_date_intern_unit')->default(0);

            $table->boolean('is_manual_delivery_date_enabled')->after('delivery_date_intern_quantity')->default(false);
            $table->enum('delivery_date_unit', ['minutes', 'hours', 'days', 'weeks'])->after('is_manual_delivery_date_enabled')->default('minutes');
            $table->integer('delivery_date_quantity')->after('delivery_date_unit')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen', function (Blueprint $table) {
            $table->dropColumn('is_manual_delivery_date_intern_enabled');
            $table->dropColumn('delivery_date_intern_unit');
            $table->dropColumn('delivery_date_intern_quantity');
            $table->dropColumn('is_manual_delivery_date_enabled');
            $table->dropColumn('delivery_date_unit');
            $table->dropColumn('delivery_date_quantity');
        });
    }
};
