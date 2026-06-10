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
        // Spanish: tipos de examenes
        Schema::create('specimen_type_examination', function (Blueprint $table) {
            $table->id();
            $table->integer('specimen_type');
            $table->string('name');
            $table->string('description');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('specimen_type_examination');
    }
};
