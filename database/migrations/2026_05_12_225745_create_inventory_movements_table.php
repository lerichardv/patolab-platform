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
        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
			$table->string('inventory_name');
			$table->foreignId('inventory')->constrained('inventory')->cascadeOnDelete();
			$table->string('storage_name');
			$table->foreignId('storage')->constrained('storage')->cascadeOnDelete();
			$table->integer('quantity_added');
			$table->integer('quantity_before_update');
			$table->integer('quantity_after_update');
			$table->enum('movement', ['added', 'removed', 'updated', 'deleted'])->default('added');
			$table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
    }
};
