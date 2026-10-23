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
        Schema::dropIfExists('pathologist_examination_durations');

        Schema::create('pathologist_examination_durations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->constrained('users', 'id', 'ped_user_fk')
                ->cascadeOnDelete();
            $table->foreignId('specimen_type_examination_id')
                ->constrained('specimen_type_examination', 'id', 'ped_exam_fk')
                ->cascadeOnDelete();
            $table->unsignedInteger('duration_minutes')->default(30);
            $table->timestamps();

            $table->unique(['user_id', 'specimen_type_examination_id'], 'ped_user_exam_unique');
            $table->index('user_id', 'ped_user_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pathologist_examination_durations');
    }
};
