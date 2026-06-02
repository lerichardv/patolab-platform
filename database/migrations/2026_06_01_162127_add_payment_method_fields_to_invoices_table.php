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
            $table->date('payment_method_date')->nullable()->after('payment_type');
            // Cash
            $table->double('cash_value', 10, 2)->nullable()->after('payment_method_date');
            // check
            $table->string('check_number')->nullable()->after('cash_value');
            $table->double('check_value', 10, 2)->nullable()->after('check_number');
            // Credit card
            $table->string('card_last_4')->nullable()->after('check_value');
            $table->double('card_value_charged', 10, 2)->nullable()->after('card_last_4');
            $table->string('card_expiration')->nullable()->after('card_value_charged');
            $table->string('card_authorization_code')->nullable()->after('card_expiration');
            // Bank transfer
            $table->foreignId('transfer_bank_id')->nullable()->after('card_authorization_code');
            $table->double('transfer_value', 10, 2)->nullable()->after('transfer_bank_id');
            $table->string('transfer_authorization_code')->nullable()->after('transfer_value');

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'payment_method_date',
                'cash_value',
                'check_number',
                'check_value',
                'card_last_4',
                'card_value_charged',
                'card_expiration',
                'card_authorization_code',
                'transfer_bank_id',
                'transfer_value',
                'transfer_authorization_code',
            ]);
        });
    }
};
