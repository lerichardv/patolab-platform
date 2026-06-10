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
        Schema::create('specimen_type_templates', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('specimen_type_id');
            $table->longText('diagnosis_html')->nullable();
            $table->longText('macroscopy_html')->nullable();
            $table->longText('microscopy_html')->nullable();
            // Foreign key
            $table->foreign('specimen_type_id')->references('id')->on('specimen_type');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('specimen_type_templates');
    }
};
