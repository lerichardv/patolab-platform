<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('database has all proposed performance indexes', function () {
    $expectedIndexes = [
        'specimen' => [
            'specimen_priority_id_index',
            'specimen_group_id_index',
            'specimen_status_index',
        ],
        'invoices' => [
            'invoices_group_id_index',
            'invoices_transfer_bank_id_index',
        ],
        'credits' => [
            'credits_specimen_id_index',
            'credits_group_id_index',
        ],
        'specimen_groups' => [
            'specimen_groups_invoice_id_index',
            'specimen_groups_customer_id_index',
        ],
        'specimen_type_examination' => [
            'specimen_type_examination_specimen_type_index',
        ],
        'priorities_specimens_order' => [
            'priorities_specimens_order_priority_id_index',
            'priorities_specimens_order_specimen_id_index',
        ],
        'audit_log' => [
            'audit_log_table_row_id_index',
        ],
    ];

    foreach ($expectedIndexes as $table => $indexes) {
        $actualIndexes = Schema::getIndexes($table);
        $actualIndexNames = collect($actualIndexes)
            ->map(fn ($idx) => $idx['name'] ?? null)
            ->filter()
            ->toArray();

        foreach ($indexes as $index) {
            expect($actualIndexNames)->toContain($index);
        }
    }
});
