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
        Schema::table('specimen_reports', function (Blueprint $table) {
            $table->text('open_text_label')->nullable()->change();
        });

        Schema::table('specimen_type_templates', function (Blueprint $table) {
            $table->text('open_text_label')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen_reports', function (Blueprint $table) {
            $table->string('open_text_label')->nullable()->default('Texto Libre')->change();
        });

        Schema::table('specimen_type_templates', function (Blueprint $table) {
            $table->string('open_text_label')->nullable()->default('Texto Libre')->change();
        });
    }
};
