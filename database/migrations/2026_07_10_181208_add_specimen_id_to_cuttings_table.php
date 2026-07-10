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
            $table->foreignId('specimen_id')->after('code_id')->constrained('specimen')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cuttings', function (Blueprint $table) {
            $table->dropForeign(['specimen_id']);
            $table->dropColumn('specimen_id');
        });
    }
};
