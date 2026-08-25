<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateInvoiceSpecimenItems extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'invoice:migrate-specimen-items';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrates existing specimen breakdown data from credit_invoice_specimens, invoice_group_specimens, and standalone invoices into invoice_specimens, merging duplicate rows per specimen/invoice.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting migration and merge of invoice specimen items...');

        $migratedCount = 0;
        $mergedCount = 0;

        DB::transaction(function () use (&$migratedCount, &$mergedCount) {
            // Pre-fetch existing valid foreign IDs for fast lookup
            $validSpecimenIds = DB::table('specimen')->pluck('id')->flip();
            $validGroupIds = DB::table('specimen_groups')->pluck('id')->flip();
            $validCreditIds = DB::table('credits')->pluck('id')->flip();
            $validInvoiceIds = DB::table('invoices')->pluck('id')->flip();

            // Build a list of all distinct (invoice_id, specimen_id) pairs from all source tables
            $pairs = collect();

            if (DB::getSchemaBuilder()->hasTable('credit_invoice_specimens')) {
                $creditPairs = DB::table('credit_invoice_specimens')
                    ->select('invoice_id', 'specimen_id')
                    ->get();
                $pairs = $pairs->concat($creditPairs);
            }

            if (DB::getSchemaBuilder()->hasTable('invoice_group_specimens')) {
                $groupPairs = DB::table('invoice_group_specimens')
                    ->select('invoice_id', 'specimen_id')
                    ->get();
                $pairs = $pairs->concat($groupPairs);
            }

            $standalonePairs = DB::table('invoices')
                ->whereNotNull('specimen_id')
                ->select('id as invoice_id', 'specimen_id')
                ->get();
            $pairs = $pairs->concat($standalonePairs);

            // Group by unique invoice_id + specimen_id
            $uniquePairs = $pairs->unique(fn ($item) => $item->invoice_id.'-'.$item->specimen_id);

            foreach ($uniquePairs as $pair) {
                $invoiceId = $pair->invoice_id;
                $specimenId = $pair->specimen_id;

                // Ensure both invoice_id and specimen_id exist in parent tables
                if (! isset($validInvoiceIds[$invoiceId]) || ! isset($validSpecimenIds[$specimenId])) {
                    continue;
                }

                // Check if already migrated to invoice_specimens
                $existing = DB::table('invoice_specimens')
                    ->where('invoice_id', $invoiceId)
                    ->where('specimen_id', $specimenId)
                    ->first();

                if ($existing) {
                    continue;
                }

                // Retrieve data from all potential sources for this pair
                $creditRow = DB::getSchemaBuilder()->hasTable('credit_invoice_specimens')
                    ? DB::table('credit_invoice_specimens')->where('invoice_id', $invoiceId)->where('specimen_id', $specimenId)->first()
                    : null;

                $groupRow = DB::getSchemaBuilder()->hasTable('invoice_group_specimens')
                    ? DB::table('invoice_group_specimens')->where('invoice_id', $invoiceId)->where('specimen_id', $specimenId)->first()
                    : null;

                $invoiceRow = DB::table('invoices')->where('id', $invoiceId)->first();
                $specimenRow = DB::table('specimen')->where('id', $specimenId)->first();

                if ($creditRow && $groupRow) {
                    $mergedCount++;
                }

                // Determine group_id and is_group
                $rawGroupId = $groupRow->group_id ?? $creditRow->group_id ?? $specimenRow->group_id ?? $invoiceRow->group_id ?? null;
                $groupId = ($rawGroupId && isset($validGroupIds[$rawGroupId])) ? $rawGroupId : null;
                $isGroup = ! is_null($groupId) || ($invoiceRow->is_group ?? false) || ($specimenRow->is_group ?? false) || ! is_null($groupRow);

                // Determine credit_id
                $rawCreditId = $creditRow->credit_id ?? $invoiceRow->credit_payment_id ?? null;
                $creditId = ($rawCreditId && isset($validCreditIds[$rawCreditId])) ? $rawCreditId : null;

                // Determine payment status (is_paid, quantity_paid)
                $isPaid = false;
                $quantityPaid = 0;

                if ($creditRow) {
                    $isPaid = (bool) $creditRow->is_paid;
                    $quantityPaid = (int) ($creditRow->quantity_paid ?? 0);
                } elseif ($invoiceRow) {
                    $isPaid = $invoiceRow->payment_type !== 'credit';
                    $quantityPaid = $isPaid ? (int) ($invoiceRow->quantity ?? 1) : 0;
                }

                // Financial values precedence: creditRow > groupRow > invoiceRow
                $quantity = $creditRow->quantity ?? $groupRow->quantity ?? $invoiceRow->quantity ?? 1;
                $amount = $creditRow->amount ?? $groupRow->amount ?? $invoiceRow->amount ?? 0.00;
                $discount = $creditRow->discount ?? $groupRow->discount ?? $invoiceRow->discount ?? 0.00;
                $subtotal = $creditRow->subtotal ?? $groupRow->subtotal ?? $invoiceRow->subtotal ?? 0.00;
                $exemptAmount = $creditRow->exempt_amount ?? $groupRow->exempt_amount ?? $invoiceRow->exempt_amount ?? 0.00;
                $taxableAmount15 = $creditRow->taxable_amount_15 ?? $groupRow->taxable_amount_15 ?? $invoiceRow->taxable_amount_15 ?? 0.00;
                $taxableAmount18 = $creditRow->taxable_amount_18 ?? $groupRow->taxable_amount_18 ?? $invoiceRow->taxable_amount_18 ?? 0.00;
                $isv15 = $creditRow->isv_15 ?? $groupRow->isv_15 ?? $invoiceRow->isv_15 ?? 0.00;
                $isv18 = $creditRow->isv_18 ?? $groupRow->isv_18 ?? $invoiceRow->isv_18 ?? 0.00;
                $total = $creditRow->total ?? $groupRow->total ?? $invoiceRow->total ?? 0.00;

                $selectedPrice = $creditRow->selected_price ?? $groupRow->selected_price ?? null;
                $customSpecimenPrice = $creditRow->custom_specimen_price ?? $groupRow->custom_specimen_price ?? $invoiceRow->custom_amount ?? 0.00;
                $additionalDiscountEnabled = (bool) ($creditRow->additional_discount_enabled ?? $groupRow->additional_discount_enabled ?? false);
                $additionalDiscount = $creditRow->additional_discount ?? $groupRow->additional_discount ?? 0.00;
                $ageDiscountType = $creditRow->age_discount_type ?? $groupRow->age_discount_type ?? $invoiceRow->age_discount_type ?? null;
                $ageDiscountAmount = $creditRow->age_discount_amount ?? $groupRow->age_discount_amount ?? $invoiceRow->age_discount_amount ?? 0.00;

                $createdAt = $creditRow->created_at ?? $groupRow->created_at ?? $invoiceRow->created_at ?? now();
                $updatedAt = $creditRow->updated_at ?? $groupRow->updated_at ?? $invoiceRow->updated_at ?? now();

                DB::table('invoice_specimens')->insert([
                    'invoice_id' => $invoiceId,
                    'specimen_id' => $specimenId,
                    'is_group' => $isGroup,
                    'group_id' => $groupId,
                    'credit_id' => $creditId,
                    'is_paid' => $isPaid,
                    'quantity_paid' => $quantityPaid,
                    'quantity' => $quantity,
                    'amount' => $amount,
                    'discount' => $discount,
                    'subtotal' => $subtotal,
                    'exempt_amount' => $exemptAmount,
                    'taxable_amount_15' => $taxableAmount15,
                    'taxable_amount_18' => $taxableAmount18,
                    'isv_15' => $isv15,
                    'isv_18' => $isv18,
                    'total' => $total,
                    'selected_price' => $selectedPrice,
                    'custom_specimen_price' => $customSpecimenPrice,
                    'additional_discount_enabled' => $additionalDiscountEnabled,
                    'additional_discount' => $additionalDiscount,
                    'age_discount_type' => $ageDiscountType,
                    'age_discount_amount' => $ageDiscountAmount,
                    'created_at' => $createdAt,
                    'updated_at' => $updatedAt,
                ]);

                $migratedCount++;
            }
        });

        $this->info("Total unique specimen invoice items migrated: {$migratedCount}");
        if ($mergedCount > 0) {
            $this->info("Merged duplicate source rows across credit/group tables: {$mergedCount}");
        }
        $this->info('Invoice specimen items migration completed successfully!');

        return 0;
    }
}
