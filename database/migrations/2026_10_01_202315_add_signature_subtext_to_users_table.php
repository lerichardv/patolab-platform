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
        Schema::table('users', function (Blueprint $table) {
            $table->text('signature_subtext')->nullable()->after('user_signature');
        });

        $titleText = "ANATOMÍA PATOLÓGICA\nMSC. PATOLOGÍA ONCOLÓGICA";

        DB::table('users')
            ->where('email', 'ana.urbina@patolab.org')
            ->orWhere('name', 'like', '%Ana Urbina%')
            ->update(['signature_subtext' => $titleText]);

        DB::table('users')
            ->where('email', 'estefany.lagos@patolab.org')
            ->orWhere('name', 'like', '%Estefany Lagos%')
            ->update(['signature_subtext' => $titleText]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('signature_subtext');
        });
    }
};
