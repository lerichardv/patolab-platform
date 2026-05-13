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
        Schema::create('sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('location_id')->constrained('locations')->cascadeOnDelete();
            $table->foreignId('specimen_type')->constrained('specimen_type')->cascadeOnDelete();
            $table->string('prefix')->required();
            $table->string('separator')->required()->default('-');
            $table->integer('fill')->default('4');
            $table->integer('month')->required()->default(date('m'));
            $table->integer('year')->required()->default(date('Y'));
            $table->integer('current_sequence')->required()->default(1);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sequences');
    }
};
