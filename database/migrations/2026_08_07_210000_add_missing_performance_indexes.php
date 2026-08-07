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
            $table->index('priority_id', 'specimen_priority_id_index');
            $table->index('group_id', 'specimen_group_id_index');
            $table->index('status', 'specimen_status_index');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->index('group_id', 'invoices_group_id_index');
            $table->index('transfer_bank_id', 'invoices_transfer_bank_id_index');
        });

        Schema::table('credits', function (Blueprint $table) {
            $table->index('specimen_id', 'credits_specimen_id_index');
            $table->index('group_id', 'credits_group_id_index');
        });

        Schema::table('specimen_groups', function (Blueprint $table) {
            $table->index('invoice_id', 'specimen_groups_invoice_id_index');
            $table->index('customer_id', 'specimen_groups_customer_id_index');
        });

        Schema::table('specimen_type_examination', function (Blueprint $table) {
            $table->index('specimen_type', 'specimen_type_examination_specimen_type_index');
        });

        Schema::table('priorities_specimens_order', function (Blueprint $table) {
            $table->index('priority_id', 'priorities_specimens_order_priority_id_index');
            $table->index('specimen_id', 'priorities_specimens_order_specimen_id_index');
        });

        Schema::table('audit_log', function (Blueprint $table) {
            $table->index(['table', 'row_id'], 'audit_log_table_row_id_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('specimen', function (Blueprint $table) {
            $table->dropIndex('specimen_priority_id_index');
            $table->dropIndex('specimen_group_id_index');
            $table->dropIndex('specimen_status_index');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex('invoices_group_id_index');
            $table->dropIndex('invoices_transfer_bank_id_index');
        });

        Schema::table('credits', function (Blueprint $table) {
            $table->dropIndex('credits_specimen_id_index');
            $table->dropIndex('credits_group_id_index');
        });

        Schema::table('specimen_groups', function (Blueprint $table) {
            $table->dropIndex('specimen_groups_invoice_id_index');
            $table->dropIndex('specimen_groups_customer_id_index');
        });

        Schema::table('specimen_type_examination', function (Blueprint $table) {
            $table->dropIndex('specimen_type_examination_specimen_type_index');
        });

        Schema::table('priorities_specimens_order', function (Blueprint $table) {
            $table->dropIndex('priorities_specimens_order_priority_id_index');
            $table->dropIndex('priorities_specimens_order_specimen_id_index');
        });

        Schema::table('audit_log', function (Blueprint $table) {
            $table->dropIndex('audit_log_table_row_id_index');
        });
    }
};
