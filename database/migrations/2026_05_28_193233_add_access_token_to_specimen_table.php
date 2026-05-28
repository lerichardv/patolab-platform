<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('specimen', function (Blueprint $table) {
            $table->string('access_token', 64)->nullable()->after('priority_id');
        });

        // Populate existing specimens with a random token
        $specimens = \DB::table('specimen')->get();
        foreach ($specimens as $specimen) {
            \DB::table('specimen')
                ->where('id', $specimen->id)
                ->update(['access_token' => \Illuminate\Support\Str::random(32)]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen', function (Blueprint $table) {
            $table->dropColumn('access_token');
        });
    }
};
