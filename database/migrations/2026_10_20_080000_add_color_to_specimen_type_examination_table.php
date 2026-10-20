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
        Schema::table('specimen_type_examination', function (Blueprint $table) {
            $table->string('color', 7)->nullable()->after('description');
        });

        // Curated palette of distinct, accessible colors for specimen types
        $palette = [
            '#3b82f6', // blue-500
            '#10b981', // emerald-500
            '#f59e0b', // amber-500
            '#8b5cf6', // violet-500
            '#ec4899', // pink-500
            '#06b6d4', // cyan-500
            '#f97316', // orange-500
            '#6366f1', // indigo-500
            '#14b8a6', // teal-500
            '#84cc16', // lime-500
        ];

        $specimenTypes = DB::table('specimen_type')->orderBy('id')->pluck('id');
        $colorMap = [];

        foreach ($specimenTypes as $index => $typeId) {
            $colorMap[$typeId] = $palette[$index % count($palette)];
        }

        foreach ($colorMap as $typeId => $color) {
            DB::table('specimen_type_examination')
                ->where('specimen_type', $typeId)
                ->whereNull('color')
                ->update(['color' => $color]);
        }

        // Set fallback for any remaining examinations without color
        DB::table('specimen_type_examination')
            ->whereNull('color')
            ->update(['color' => '#3b82f6']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen_type_examination', function (Blueprint $table) {
            $table->dropColumn('color');
        });
    }
};
