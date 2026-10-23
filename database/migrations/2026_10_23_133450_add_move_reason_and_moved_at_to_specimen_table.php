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
            $table->string('move_reason', 1000)->nullable()->after('cancellation_reason');
            $table->timestamp('moved_at')->nullable()->after('move_reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen', function (Blueprint $table) {
            $table->dropColumn(['move_reason', 'moved_at']);
        });
    }
};
