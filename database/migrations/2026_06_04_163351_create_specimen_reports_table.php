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
        Schema::create('specimen_reports', function (Blueprint $table) {
            $table->id();
            // Macroscopia
            $table->date('report_date')->index();
            $table->timestamp('generated_at')->useCurrent();
            $table->longText('macroscopy_html')->nullable();
            $table->timestamp('macroscopy_finalization_datetime')->nullable(); // these are just for administrative purposes
            // Microscopia
            $table->longText('microscopy_html')->nullable();
            $table->timestamp('microscopy_finalization_datetime')->nullable(); // these are just for administrative purposes
            // Diagnóstico
            $table->longText('diagnosis_html')->nullable();
            //
            $table->timestamp('report_finalization_datetime')->nullable(); // these are just for administrative purposes
            $table->timestamps();
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE specimen_reports ADD yjs_macroscopy_state LONGBLOB NULL AFTER macroscopy_html');
            DB::statement('ALTER TABLE specimen_reports ADD yjs_microscopy_state LONGBLOB NULL AFTER microscopy_html');
            DB::statement('ALTER TABLE specimen_reports ADD yjs_diagnosis_state LONGBLOB NULL AFTER diagnosis_html');
        } else {
            Schema::table('specimen_reports', function (Blueprint $table) {
                $table->binary('yjs_macroscopy_state')->nullable();
                $table->binary('yjs_microscopy_state')->nullable();
                $table->binary('yjs_diagnosis_state')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen', function (Blueprint $table) {
            // $table->dropForeign(['report_id']);
        });
        Schema::dropIfExists('specimen_reports');
    }
};
