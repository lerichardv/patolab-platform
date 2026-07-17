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
        Schema::table('settings', function (Blueprint $table) {
            $table->boolean('has_multiple_values')->default(false)->after('setting_value');
            $table->json('setting_value_multiple')->nullable()->after('has_multiple_values');
            $table->string('setting_value')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('settings')->whereNull('setting_value')->update([
            'setting_value' => '',
        ]);
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn(['has_multiple_values', 'setting_value_multiple']);
        });
    }
};
