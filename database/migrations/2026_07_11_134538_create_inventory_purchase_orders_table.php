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
        Schema::create('inventory_purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->generate(8, 'hex'); // This will be an unique 8 hexadecimal number generated randomly
            $table->foreignId('provider_id')->constrained('inventory_providers')->cascadeOnDelete();
            $table->foreignId('requester_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('date_requested')->useCurrent();
            $table->timestamp('date_delivered')->nullable();
            $table->enum('status', ['pending', 'received'])->default('pending');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_purchase_orders');
    }
};
