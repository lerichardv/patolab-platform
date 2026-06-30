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
        Schema::create('work_order_types', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Ej: "Biopsia Regular", "Citología Urgente"
            $table->string('duration_unit'); // 'hours' o 'days'
            $table->integer('duration_value'); // El número de horas o días

            // Regla especial: Entrega el mismo día si se ingresa en cierto rango
            $table->boolean('same_day_rule_enabled')->default(false); // El "switch"
            $table->time('same_day_cutoff_start')->nullable(); // Ej: '00:00:00'
            $table->time('same_day_cutoff_end')->nullable();   // Ej: '12:00:00'

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_order_types');
    }
};
