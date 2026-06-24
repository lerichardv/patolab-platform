<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('specimen_reports', function (Blueprint $table) {
            $table->longText('clinical_details_html')->nullable();
            $table->longText('comments_notes_html')->nullable();
            $table->longText('protocols_html')->nullable();
            $table->longText('legend_html')->nullable();
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE specimen_reports ADD yjs_clinical_details_state LONGBLOB NULL AFTER clinical_details_html');
            DB::statement('ALTER TABLE specimen_reports ADD yjs_comments_notes_state LONGBLOB NULL AFTER comments_notes_html');
            DB::statement('ALTER TABLE specimen_reports ADD yjs_protocols_state LONGBLOB NULL AFTER protocols_html');
            DB::statement('ALTER TABLE specimen_reports ADD yjs_legend_state LONGBLOB NULL AFTER legend_html');
        } else {
            Schema::table('specimen_reports', function (Blueprint $table) {
                $table->binary('yjs_clinical_details_state')->nullable();
                $table->binary('yjs_comments_notes_state')->nullable();
                $table->binary('yjs_protocols_state')->nullable();
                $table->binary('yjs_legend_state')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen_reports', function (Blueprint $table) {
            $table->dropColumn([
                'clinical_details_html',
                'comments_notes_html',
                'protocols_html',
                'legend_html',
                'yjs_clinical_details_state',
                'yjs_comments_notes_state',
                'yjs_protocols_state',
                'yjs_legend_state',
            ]);
        });
    }
};
