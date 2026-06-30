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
        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();

            // Relaciones principales
            // Asumiendo que tus tablas se llaman 'samples' y 'users' (o 'pathologists')
            $table->foreignId('specimen_id')->constrained('specimen')->onDelete('cascade');
            $table->foreignId('work_order_type_id')->constrained()->onDelete('restrict');

            // Técnico asignado (puede ser nullable si se crean sin asignar inicialmente)
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');

            // Quién finaliza el trabajo (Requerimiento: "quien toma el trabajo y lo pasa a finalizado es el que recibe")
            $table->foreignId('completed_by_id')->nullable()->constrained('users')->onDelete('set null');

            // Atributos de la orden
            $table->enum('status', ['Enviada', 'En Proceso', 'Finalizada'])->default('Enviada');
            $table->integer('priority')->default(2); // Ej: 1 = Alta, 2 = Media, 3 = Baja (Fácil de ordenar en Query)
            $table->text('comments')->nullable();

            // Fechas calculadas por el sistema según las reglas del tipo de orden
            $table->timestamp('due_date')->nullable(); // Fecha estimada de entrega
            $table->timestamp('completed_at')->nullable(); // Cuándo se finalizó realmente

            $table->softDeletes();
            $table->timestamps();

            // Índices para optimizar las vistas del tablero/listado de los patólogos
            $table->index(['status', 'priority']);
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_orders');
    }
};
