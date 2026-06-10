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
        Schema::create('cai_ranges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('location_id')->constrained('locations');

            $table->string('cai', 100);
            $table->string('full_prefix', 20); // Ej: "000-001-01-"
            $table->string('emission', 3);     // Ej: "000"
            $table->string('establishment', 3);    // Ej: "001"
            $table->string('document_type', 2);     // Ej: "01"

            $table->bigInteger('start_number');
            $table->bigInteger('end_number');
            $table->bigInteger('last_used_number');

            $table->date('deadline');
            $table->enum('status', ['active', 'exhausted', 'expired'])->default('active');

            $table->integer('limit_percentage_warning')->default(10);
            $table->integer('limit_days_warning')->default(15);
            $table->integer('warning_notifications_amount')->default(3);
            $table->integer('warning_notifications_sent')->default(0);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cai_ranges');
    }
};
