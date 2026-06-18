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
        Schema::table('invoices', function (Blueprint $table) {
            $table->unsignedBigInteger('rental_id')->nullable()->after('specimen_id');
            $table->foreign('rental_id')->references('id')->on('rentals')->onDelete('cascade');
            $table->index('rental_id');

            $table->dropForeign(['specimen_id']);
            $table->unsignedBigInteger('specimen_id')->nullable()->change();
            $table->foreign('specimen_id')->references('id')->on('specimen')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('invoices')
            ->whereNull('specimen_id')->update([
                'specimen_id' => 1,
            ]);
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['rental_id']);
            $table->dropColumn('rental_id');

            $table->dropForeign(['specimen_id']);
            $table->unsignedBigInteger('specimen_id')->nullable(false)->change();
            $table->foreign('specimen_id')->references('id')->on('specimen')->cascadeOnDelete();
        });
    }
};
