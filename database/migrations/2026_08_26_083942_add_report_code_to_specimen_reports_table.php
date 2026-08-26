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
            $table->string('report_code', 12)->after('id')->nullable()->unique();
        });

        $reports = DB::table('specimen_reports')->select('id')->get();
        $generatedCodes = [];

        foreach ($reports as $report) {
            do {
                $code = strtoupper(bin2hex(random_bytes(6)));
            } while (isset($generatedCodes[$code]) || DB::table('specimen_reports')->where('report_code', $code)->exists());

            $generatedCodes[$code] = true;

            DB::table('specimen_reports')->where('id', $report->id)->update([
                'report_code' => $code,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen_reports', function (Blueprint $table) {
            $table->dropColumn('report_code');
        });
    }
};
