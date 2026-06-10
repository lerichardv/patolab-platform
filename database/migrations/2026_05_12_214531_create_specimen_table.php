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
        Schema::create('specimen', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('specimen_type')->constrained('specimen_type')->cascadeOnDelete();
            $table->foreignId('specimen_type_examination')->constrained('specimen_type_examination')->cascadeOnDelete();
            $table->foreignId('specimen_category')->constrained('specimen_category')->cascadeOnDelete();
            $table->foreignId('referrer')->constrained('referrers')->cascadeOnDelete();
            $table->string('anatomic_site');
            $table->string('diagnosis');
            $table->string('clinical_notes');
            $table->enum('status', ['received', 'macroscopic_review', 'processing', 'microscopic_review', 'finalized', 'delivered', 'cancelled'])->default('received');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('specimen');
    }
};
