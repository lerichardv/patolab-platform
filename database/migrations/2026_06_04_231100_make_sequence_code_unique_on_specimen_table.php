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
        // 1. Resolve duplicates or defaults before making it unique
        $specimens = DB::table('specimen')->get();
        $seen = [];
        foreach ($specimens as $s) {
            $code = $s->sequence_code;
            if (empty($code) || $code === 'XXX-0000-00-0000' || in_array($code, $seen)) {
                $uniqueCode = 'FIX-'.strtoupper(substr(uniqid(), -8)).'-'.date('m-Y');
                while (DB::table('specimen')->where('sequence_code', $uniqueCode)->exists() || in_array($uniqueCode, $seen)) {
                    $uniqueCode = 'FIX-'.strtoupper(substr(uniqid(), -8)).'-'.date('m-Y');
                }
                DB::table('specimen')->where('id', $s->id)->update(['sequence_code' => $uniqueCode]);
                $code = $uniqueCode;
            }
            $seen[] = $code;
        }

        // 2. Add the unique index
        Schema::table('specimen', function (Blueprint $table) {
            $table->unique('sequence_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen', function (Blueprint $table) {
            $table->dropUnique(['sequence_code']);
        });
    }
};
