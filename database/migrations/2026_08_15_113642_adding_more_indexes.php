<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add missing search and lookup indexes for customers[cite: 1]
        Schema::table('customers', function (Blueprint $table) {
            $table->index('id_number', 'customers_id_number_index');
            $table->index('phone', 'customers_phone_index');
        });

        // Add indexes for public tokens and dashboard status/date filtering[cite: 1]
        Schema::table('specimen', function (Blueprint $table) {
            $table->index('access_token', 'specimen_access_token_index');
            $table->index('delivery_token', 'specimen_delivery_token_index');
            $table->index(['status', 'created_at'], 'specimen_status_created_at_index');
            $table->index(['location_id', 'status'], 'specimen_location_status_index');
        });

        // Add indexes for public group tokens[cite: 1]
        Schema::table('specimen_groups', function (Blueprint $table) {
            $table->index('access_token', 'specimen_groups_access_token_index');
        });

        // Add indexing for invoice reporting and credit payment lookups[cite: 1]
        Schema::table('invoices', function (Blueprint $table) {
            $table->index('invoice_date', 'invoices_invoice_date_index');
            $table->index('credit_payment_id', 'invoices_credit_payment_id_index');
            $table->index(['customer_id', 'invoice_date'], 'invoices_customer_date_index');
        });

        // Add composite index for audit log history lookups[cite: 1]
        Schema::table('audit_log', function (Blueprint $table) {
            $table->index(['table', 'row_id', 'created_at'], 'audit_log_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex('customers_id_number_index');
            $table->dropIndex('customers_phone_index');
        });

        Schema::table('specimen', function (Blueprint $table) {
            $table->dropIndex('specimen_access_token_index');
            $table->dropIndex('specimen_delivery_token_index');
            $table->dropIndex('specimen_status_created_at_index');
            $table->dropIndex('specimen_location_status_index');
        });

        Schema::table('specimen_groups', function (Blueprint $table) {
            $table->dropIndex('specimen_groups_access_token_index');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex('invoices_invoice_date_index');
            $table->dropIndex('invoices_credit_payment_id_index');
            $table->dropIndex('invoices_customer_date_index');
        });

        Schema::table('audit_log', function (Blueprint $table) {
            $table->dropIndex('audit_log_lookup_idx');
        });
    }
};
