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
        Schema::table('specimen_category', function (Blueprint $table) {
            $table->enum('intern_unit', ['minutes', 'hours', 'days', 'weeks'])->default('days')->after('quantity');
            $table->integer('intern_quantity')->default(1)->after('intern_unit');

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen_category', function (Blueprint $table) {
            $table->dropColumn(['intern_unit', 'intern_quantity']);
        });
    }
};
