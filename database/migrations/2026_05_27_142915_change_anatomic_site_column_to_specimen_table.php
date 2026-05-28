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
        Schema::table('specimen', function (Blueprint $table) {
            $table->string('anatomic_site')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reemplazar NULLs por un valor por defecto
        DB::table('specimen')
            ->whereNull('anatomic_site')
            ->update([
                'anatomic_site' => '',
            ]);
        Schema::table('specimen', function (Blueprint $table) {
            $table->string('anatomic_site')->nullable(false)->change();
        });
    }
};
