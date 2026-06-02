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
        // Delete rows from priorities_specimens_order where specimen_id and priority_id do not match the current specimen state
        \DB::table('priorities_specimens_order')
            ->whereNotExists(function ($query) {
                $query->select(\DB::raw(1))
                    ->from('specimen')
                    ->whereColumn('specimen.id', '=', 'priorities_specimens_order.specimen_id')
                    ->whereColumn('specimen.priority_id', '=', 'priorities_specimens_order.priority_id');
            })
            ->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse operation needed for cleanup migration
    }
};
