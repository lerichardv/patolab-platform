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
        // This table is used to share specimen report templates (specimen_type_templates)
        // with other users, allowing them to use or edit the template based on permission grants.
        Schema::create('user_templates_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('specimen_type_id')->constrained('specimen_type')->cascadeOnDelete();
            $table->foreignId('specimen_type_examination_id')->constrained('specimen_type_examination')->cascadeOnDelete();
            $table->foreignId('template_id')->constrained('specimen_type_templates')->cascadeOnDelete();
            $table->foreignId('shared_with_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_templates_permissions');
    }
};
