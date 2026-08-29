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
        Schema::table('specimen_reports', function (Blueprint $table) {
            $table->boolean('auto_finalization_date')->default(true)->after('finalization_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen_reports', function (Blueprint $table) {
            $table->dropColumn('auto_finalization_date');
        });
    }
};
