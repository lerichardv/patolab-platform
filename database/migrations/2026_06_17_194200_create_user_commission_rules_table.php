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
        Schema::create('user_commission_rules', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('specimen_type_id')->constrained('specimen_type')->onDelete('cascade');
            $table->foreignId('specimen_type_examination_id')->constrained('specimen_type_examination')->onDelete('cascade');

            $table->boolean('macroscopy_commission_enabled')->default(false);
            $table->enum('macroscopy_calculation_type', ['fixed', 'percentage'])->nullable();
            $table->decimal('macroscopy_commission_value', 10, 2)->default(0.00);

            $table->boolean('microscopy_commission_enabled')->default(false);
            $table->enum('microscopy_calculation_type', ['fixed', 'percentage'])->nullable();
            $table->decimal('microscopy_commission_value', 10, 2)->default(0.00);

            // Índice único para evitar reglas duplicadas para el mismo patólogo y estudio
            $table->unique(['user_id', 'specimen_type_id', 'specimen_type_examination_id'], 'user_specimen_type_and_examination_unique');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_commission_rules');
    }
};
