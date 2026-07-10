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
        Schema::create('cuttings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('code_id')->constrained('cutting_codes')->onDelete('cascade');
            $table->string('description');
            $table->integer('number_of_cuttings');
            $table->string('cuttings_description');
            $table->integer('number_of_slides')->nullable();
            // NOTE: The 'cutting_slide_types' column stores the IDs (from the work_order_types table)
            // instead of CuttingSlideType names/IDs, as cutting_slide_types table was deleted.
            $table->json('cutting_slide_types')->nullable();
            $table->enum('status', ['macroscopy', 'processing', 'delivered'])->default('macroscopy');
            $table->string('comments')->nullable();
            $table->foreignId('responsible_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cuttings');
    }
};
