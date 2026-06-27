<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Set next AUTO_INCREMENT value
        if (Illuminate\Support\Facades\DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE credits AUTO_INCREMENT = 100000;');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Illuminate\Support\Facades\DB::getDriverName() === 'mysql') {
            $maxId = DB::table('credits')->max('id') ?? 0;
            $nextId = $maxId + 1;

            DB::statement("ALTER TABLE credits AUTO_INCREMENT = {$nextId};");
        }
    }
};
