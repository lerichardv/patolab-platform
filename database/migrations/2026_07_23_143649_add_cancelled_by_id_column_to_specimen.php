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
            $table->foreignId('cancelled_by_id')->after('cancelled_at')->nullable()->constrained('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen', function (Blueprint $table) {
            $table->dropForeign(['cancelled_by_id']);
            $table->dropColumn('cancelled_by_id');
        });
    }
};
