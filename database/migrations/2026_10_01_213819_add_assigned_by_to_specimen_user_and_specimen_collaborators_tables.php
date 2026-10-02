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
        Schema::table('specimen_user', function (Blueprint $table) {
            $table->foreignId('assigned_by')
                ->nullable()
                ->after('microscopy_access')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('specimen_collaborators', function (Blueprint $table) {
            $table->foreignId('assigned_by')
                ->nullable()
                ->after('microscopy_access')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen_user', function (Blueprint $table) {
            $table->dropForeign(['assigned_by']);
            $table->dropColumn('assigned_by');
        });

        Schema::table('specimen_collaborators', function (Blueprint $table) {
            $table->dropForeign(['assigned_by']);
            $table->dropColumn('assigned_by');
        });
    }
};
