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
        Schema::create('specimen_examinations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('specimen_id')->constrained('specimen')->cascadeOnDelete();
            $table->foreignId('examination_id')->constrained('specimen_type_examination')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['specimen_id', 'examination_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('specimen_examinations');
    }
};
