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
        Schema::create('specimen_group_customers', function (Blueprint $table) {
            $table->id();
            $table->integer('customer_id');
            $table->integer('specimen_group_id');
            $table->timestamps();
            $table->index(['customer_id']);
            $table->index(['specimen_group_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('specimen_group_customers');
    }
};
