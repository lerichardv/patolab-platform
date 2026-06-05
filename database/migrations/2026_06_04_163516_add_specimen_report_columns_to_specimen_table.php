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
            $table->unsignedBigInteger('report_id')->nullable()->after('group_id');
            $table->foreign('report_id')->references('id')->on('specimen_reports');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen', function (Blueprint $table) {
            $table->dropForeign(['report_id']);
            $table->dropColumn('report_id');
        });
    }
};
