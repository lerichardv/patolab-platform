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
        Schema::create('user_commissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('specimen_id')->constrained('specimen')->onDelete('cascade');
            $table->foreignId('user_commission_rule_id')->constrained('user_commission_rules')->onDelete('cascade');
            $table->enum('phase', ['macroscopy', 'microscopy']);
            $table->decimal('specimen_base_amount', 10, 2)->default(0.00);
            $table->decimal('calculated_comission_amount', 10, 2)->default(0.00);
            $table->json('user_commission_rule_applied');

            // Estado del pago al patólogo (Gestión de secretaría/administración)
            $table->enum('status', ['pending', 'paid', 'cancelled'])->default('pending');
            $table->timestamp('paid_at')->nullable();

            // Auditoría
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->foreignId('paid_by')->nullable()->constrained('users');

            $table->timestamps();

            // Evita que se le pague dos veces al mismo patólogo por la misma fase del mismo caso
            $table->unique(['user_id', 'specimen_id', 'phase']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_commissions');
    }
};
