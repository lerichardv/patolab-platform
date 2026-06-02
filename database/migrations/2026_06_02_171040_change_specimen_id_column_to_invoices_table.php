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
            // 1. Drop the active foreign key constraint
            $table->dropForeign(['specimen_id']);

            // 2. Modify the column to be nullable
            $table->unsignedBigInteger('specimen_id')->nullable()->change();

            // 3. Re-create the foreign key constraint
            $table->foreign('specimen_id')
                ->references('id')
                ->on('specimen')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // 1. Drop the active foreign key constraint
            $table->dropForeign(['specimen_id']);

            // Change back to NOT NULL (require specimen_id)
            $table->unsignedBigInteger('specimen_id')->nullable(false)->change();

            // 2. Re-create the foreign key constraint
            $table->foreign('specimen_id')
                ->references('id')
                ->on('specimen')
                ->cascadeOnDelete();
        });
    }
};
