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
        Schema::table('specimen', function (Blueprint $table) {
            $table->foreignId('location_id')->nullable()->after('customer')->constrained('locations')->nullOnDelete();
        });

        // Fetch all specimens and update their location_id
        $specimens = DB::table('specimen')->get();
        foreach ($specimens as $specimen) {
            $locationId = null;

            // Find invoice for this specimen
            $invoice = DB::table('invoices')->where('specimen_id', $specimen->id)->first();
            if ($invoice && $invoice->cai_range_id) {
                $caiRange = DB::table('cai_ranges')->where('id', $invoice->cai_range_id)->first();
                if ($caiRange) {
                    $locationId = $caiRange->location_id;
                }
            }

            if (! $locationId) {
                // Fallback to active CAI range's location
                $caiRange = DB::table('cai_ranges')->where('status', 'active')->first();
                if ($caiRange) {
                    $locationId = $caiRange->location_id;
                } else {
                    // Fallback to first location
                    $locationId = DB::table('locations')->value('id');
                }
            }

            if ($locationId) {
                DB::table('specimen')->where('id', $specimen->id)->update(['location_id' => $locationId]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen', function (Blueprint $table) {
            $table->dropForeign(['location_id']);
            $table->dropColumn('location_id');
        });
    }
};
