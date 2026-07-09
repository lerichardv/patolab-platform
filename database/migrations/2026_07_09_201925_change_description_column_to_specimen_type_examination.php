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
        Schema::table('specimen_type_examination', function (Blueprint $table) {
            $table->string('description')->nullable()->change();

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('specimen_type_examination')->whereNull('description')->update(['description' => '']);
        Schema::table('specimen_type_examination', function (Blueprint $table) {
            $table->string('description')->nullable(false)->change();
        });
    }
};
