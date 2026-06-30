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
        Schema::create('work_orders_users', function (Blueprint $table) {
            $table->id();

            // Llaves foráneas
            $table->foreignId('work_order_id')->constrained('work_orders')->onDelete('cascade');
            // Asumiendo que tu modelo/tabla de patólogos es 'users'
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            $table->timestamps();

            // Evita que un mismo patólogo se asigne dos veces a la misma orden
            $table->unique(['work_order_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_orders_users');
    }
};
