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
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            
            // Required columns
            $table->string('name');
            $table->string('id_number')->unique(); // Identidad o RTN
            $table->string('phone');
            $table->string('gender'); // Sexo
            $table->string('state');  // Departamento
            $table->string('city');   // Municipio
            $table->enum('type', ['cliente', 'empresa']); // Tipo Cliente: Cliente (individual) / Empresa (company)
            
            // Not required columns
            $table->integer('age')->nullable(); // will be required if the type is 'cliente'
            $table->string('secondary_phone')->nullable();
            $table->text('address')->nullable();
            $table->string('email')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
