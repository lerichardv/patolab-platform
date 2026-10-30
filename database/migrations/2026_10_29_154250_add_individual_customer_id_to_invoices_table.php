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
        Schema::table('invoices', function (Blueprint $table) {
            $table->foreignId('individual_customer_id')
                ->nullable()
                ->after('customer_id')
                ->constrained('customers')
                ->nullOnDelete();
        });

        DB::table('invoices')
            ->where('is_group', false)
            ->whereNotNull('customer_id')
            ->whereNull('individual_customer_id')
            ->update([
                'individual_customer_id' => DB::raw('customer_id'),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropConstrainedForeignId('individual_customer_id');
        });
    }
};
