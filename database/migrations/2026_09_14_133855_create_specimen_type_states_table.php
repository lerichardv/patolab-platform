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
        Schema::create('specimen_type_states', function (Blueprint $table) {
            $table->id();
            $table->foreignId('specimen_type_id')
                ->constrained('specimen_type')
                ->cascadeOnDelete();
            $table->string('status');
            $table->unsignedInteger('step_order')->default(1);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['specimen_type_id', 'status'], 'specimen_type_states_status_unique');
            $table->index(['specimen_type_id', 'active', 'step_order'], 'specimen_type_states_flow_idx');
        });

        // Seed default 7 states for all existing specimen types
        $specimenTypes = DB::table('specimen_type')->pluck('id');
        $defaultStates = [
            1 => 'received',
            2 => 'macroscopic_review',
            3 => 'processing',
            4 => 'microscopic_review',
            5 => 'finalized',
            6 => 'delivered',
            7 => 'cancelled',
        ];

        $records = [];
        $now = now();
        foreach ($specimenTypes as $typeId) {
            foreach ($defaultStates as $order => $status) {
                $records[] = [
                    'specimen_type_id' => $typeId,
                    'status' => $status,
                    'step_order' => $order,
                    'active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        if (! empty($records)) {
            DB::table('specimen_type_states')->insert($records);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('specimen_type_states');
    }
};
