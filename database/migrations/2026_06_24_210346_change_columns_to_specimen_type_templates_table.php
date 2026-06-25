<?php

use App\Models\SpecimenTypeTemplate;
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
            $table->longText('clinical_details_html')->nullable()->change();
            $table->longText('comments_notes_html')->nullable()->change();
            $table->longText('protocols_html')->nullable()->change();
            $table->longText('legend_html')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // update all the clinical_details_html, comments_notes_html, protocols_html, legend_html to empty string if they are null
        SpecimenTypeTemplate::whereNull('clinical_details_html')->update(['clinical_details_html' => '']);
        SpecimenTypeTemplate::whereNull('comments_notes_html')->update(['comments_notes_html' => '']);
        SpecimenTypeTemplate::whereNull('protocols_html')->update(['protocols_html' => '']);
        SpecimenTypeTemplate::whereNull('legend_html')->update(['legend_html' => '']);
        Schema::table('specimen_type_templates', function (Blueprint $table) {
            $table->text('clinical_details_html')->nullable(false)->change();
            $table->text('comments_notes_html')->nullable(false)->change();
            $table->text('protocols_html')->nullable(false)->change();
            $table->text('legend_html')->nullable(false)->change();
        });
    }
};
