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
        Schema::table('specimen_reports', function (Blueprint $table) {
            $table->longText('open_text_html')->nullable();
            $table->string('open_text_label')->nullable()->default('Texto Libre');
            $table->longText('addendum_html')->nullable();
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE specimen_reports ADD yjs_open_text_state LONGBLOB NULL AFTER open_text_html');
            DB::statement('ALTER TABLE specimen_reports ADD yjs_addendum_state LONGBLOB NULL AFTER addendum_html');
        } else {
            Schema::table('specimen_reports', function (Blueprint $table) {
                $table->binary('yjs_open_text_state')->nullable();
                $table->binary('yjs_addendum_state')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen_reports', function (Blueprint $table) {
            $table->dropColumn([
                'open_text_html',
                'open_text_label',
                'addendum_html',
                'yjs_open_text_state',
                'yjs_addendum_state',
            ]);
        });
    }
};
