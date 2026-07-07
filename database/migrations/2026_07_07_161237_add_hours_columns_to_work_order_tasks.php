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
        Schema::table('work_order_tasks', function (Blueprint $table) {

            $table->string('duration_unit')->after('description'); // 'hours' o 'days'
            $table->integer('duration_value')->after('duration_unit'); // El número de horas o días

            // Regla especial: Entrega el mismo día si se ingresa en cierto rango
            $table->boolean('same_day_rule_enabled')->default(false)->after('duration_value'); // El "switch"
            $table->time('same_day_cutoff_start')->nullable()->after('same_day_rule_enabled'); // Ej: '00:00:00'
            $table->time('same_day_cutoff_end')->nullable()->after('same_day_cutoff_start');   // Ej: '12:00:00'

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_order_tasks', function (Blueprint $table) {
            $table->dropColumn(['duration_unit', 'duration_value', 'same_day_rule_enabled', 'same_day_cutoff_start', 'same_day_cutoff_end']);
        });
    }
};
