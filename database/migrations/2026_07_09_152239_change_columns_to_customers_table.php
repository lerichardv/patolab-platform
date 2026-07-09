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
        Schema::table('customers', function (Blueprint $table) {
            $table->string('phone')->nullable()->change();
            $table->string('gender')->nullable()->change(); // Sexo
            $table->string('state')->nullable()->change();  // Departamento
            $table->string('city')->nullable()->change();   // Municipio
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('customers')->whereNull('phone')->orWhereNull('gender')->orWhereNull('state')->orWhereNull('city')->update([
            'phone' => 'n/a',
            'gender' => 'n/a',
            'state' => 'n/a',
            'city' => 'n/a',
        ]);
        Schema::table('customers', function (Blueprint $table) {
            $table->string('phone')->nullable(false)->change();
            $table->string('gender')->nullable(false)->change(); // Sexo
            $table->string('state')->nullable(false)->change();  // Departamento
            $table->string('city')->nullable(false)->change();   // Municipio
        });
    }
};
