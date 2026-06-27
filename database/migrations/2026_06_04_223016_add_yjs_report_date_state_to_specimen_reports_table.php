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
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE specimen_reports ADD yjs_report_date_state LONGBLOB NULL AFTER report_date');
        } else {
            Schema::table('specimen_reports', function (Blueprint $table) {
                $table->binary('yjs_report_date_state')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen_reports', function (Blueprint $table) {
            $table->dropColumn('yjs_report_date_state');
        });
    }
};
