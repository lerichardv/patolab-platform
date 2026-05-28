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
        DB::statement('ALTER TABLE credits AUTO_INCREMENT = 100000;');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $maxId = DB::table('credits')->max('id') ?? 0;
        $nextId = $maxId + 1;

        DB::statement("ALTER TABLE credits AUTO_INCREMENT = {$nextId};");
    }
};
