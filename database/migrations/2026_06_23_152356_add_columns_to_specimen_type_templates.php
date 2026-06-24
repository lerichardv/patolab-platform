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
            $table->foreignId('specimen_type_examination_id')->after('specimen_type_id')->constrained('specimen_type_examination')->onDelete('cascade');
            $table->longText('clinical_details_html')->after('specimen_type_examination_id');
            $table->longText('comments_notes_html')->after('diagnosis_html');
            $table->longText('protocols_html')->after('comments_notes_html');
            $table->longText('legend_html')->after('microscopy_html');
            $table->foreignId('user_id')->after('legend_html')->constrained('users')->onDelete('cascade');
            $table->json('sections_order')->nullable()->after('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen_type_templates', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropForeign(['specimen_type_examination_id']);
            $table->dropColumn('user_id');
            $table->dropColumn('specimen_type_examination_id');
            $table->dropColumn('clinical_details_html');
            $table->dropColumn('comments_notes_html');
            $table->dropColumn('protocols_html');
            $table->dropColumn('legend_html');
            $table->dropColumn('sections_order');
        });
    }
};
