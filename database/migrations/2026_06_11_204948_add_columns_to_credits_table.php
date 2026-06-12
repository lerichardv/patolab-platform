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
        Schema::table('credits', function (Blueprint $table) {
            $table->timestamp('last_payment_date')->useCurrent()->after('group_id');
            $table->unsignedInteger('reminder_interval_in_seconds')->default(604800)->after('last_payment_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('credits', function (Blueprint $table) {
            $table->dropColumn(['last_payment_date', 'reminder_interval_in_seconds']);
        });
    }
};
