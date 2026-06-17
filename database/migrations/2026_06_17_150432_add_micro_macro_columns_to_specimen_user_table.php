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
        Schema::table('specimen_user', function (Blueprint $table) {
            $table->boolean('macroscopy_access')->default(false)->after('specimen_id');
            $table->boolean('microscopy_access')->default(false)->after('macroscopy_access');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen_user', function (Blueprint $table) {
            $table->dropColumn('macroscopy_access');
            $table->dropColumn('microscopy_access');
        });
    }
};
