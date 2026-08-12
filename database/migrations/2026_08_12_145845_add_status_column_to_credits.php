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
        Schema::table('credits', function (Blueprint $table) {
            $table->enum('status', ['pending', 'partial', 'invoice generated', 'paid', 'cancelled'])->after('amount_remaining')->default('pending');
        });

        DB::table('credits')->where('amount_remaining', '<=', 0)->update([
            'status' => 'paid',
        ]);

        DB::table('credits')->where('amount_paid', '>', 0)->where('amount_remaining', '>', 0)->update([
            'status' => 'partial',
        ]);

        DB::table('credits')->where('amount_paid', '<=', 0)->where('amount_remaining', '>', 0)->update([
            'status' => 'pending',
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('credits', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
