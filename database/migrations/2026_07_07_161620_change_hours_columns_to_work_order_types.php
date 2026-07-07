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
        Schema::table('work_order_types', function (Blueprint $table) {
            $table->string('duration_unit')->nullable()->change(); // 'hours' o 'days'
            $table->integer('duration_value')->nullable()->change(); // El número de horas o días
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_order_types', function (Blueprint $table) {
            $table->string('duration_unit')->nullable(false)->change(); // 'hours' o 'days'
            $table->integer('duration_value')->nullable(false)->change(); // El número de horas o días
        });
    }
};
