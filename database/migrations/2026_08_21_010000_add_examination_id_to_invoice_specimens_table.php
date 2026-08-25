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
        Schema::table('invoice_specimens', function (Blueprint $table) {
            $table->foreignId('examination_id')
                ->nullable()
                ->after('specimen_id')
                ->constrained('specimen_type_examination')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoice_specimens', function (Blueprint $table) {
            $table->dropForeign(['examination_id']);
            $table->dropColumn('examination_id');
        });
    }
};
