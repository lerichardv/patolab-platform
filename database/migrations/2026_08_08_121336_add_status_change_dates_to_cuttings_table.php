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
        Schema::table('cuttings', function (Blueprint $table) {
            $table->dateTime('macroscopy_date')->nullable()->after('status');
            $table->dateTime('processing_date')->nullable()->after('macroscopy_date');
            $table->dateTime('delivery_date')->nullable()->after('processing_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cuttings', function (Blueprint $table) {
            $table->dropColumn(['macroscopy_date', 'processing_date', 'delivery_date']);
        });
    }
};
