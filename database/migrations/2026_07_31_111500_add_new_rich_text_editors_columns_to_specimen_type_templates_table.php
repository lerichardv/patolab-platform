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
        Schema::table('specimen_type_templates', function (Blueprint $table) {
            $table->longText('open_text_html')->nullable();
            $table->string('open_text_label')->nullable()->default('Texto Libre');
            $table->longText('addendum_html')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen_type_templates', function (Blueprint $table) {
            $table->dropColumn([
                'open_text_html',
                'open_text_label',
                'addendum_html',
            ]);
        });
    }
};
