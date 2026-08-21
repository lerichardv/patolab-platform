<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\SpecimenTypeExamination;

class InvoiceCalculationService
{
    /**
     * Calculate item breakdown values for a single examination line item.
     */
    public static function calculateItem(array $itemData, ?SpecimenTypeExamination $examination = null, ?array $settings = null): array
    {
        if ($settings === null) {
            $settings = Setting::all()->pluck('setting_value', 'setting_key')->toArray();
        }

        $thirdAgePercent = (float) ($settings['third_age_discount'] ?? 30.0);
        $fourthAgePercent = (float) ($settings['fourth_age_discount'] ?? 40.0);

        if (! $examination && ! empty($itemData['examination_id'])) {
            $examination = SpecimenTypeExamination::with('prices')->find($itemData['examination_id']);
        }

        $prices = $examination ? ($examination->prices ?? collect()) : collect();
        $priceAmounts = $prices->map(fn ($p) => (float) $p->amount)->toArray();
        $maxPrice = count($priceAmounts) > 0 ? max($priceAmounts) : 0.0;

        $selectedPrice = $itemData['selected_price'] ?? null;
        $customPrice = (float) ($itemData['custom_specimen_price'] ?? 0.0);

        if ($selectedPrice === 'custom') {
            $basePrice = $customPrice > 0 ? $customPrice : $maxPrice;
        } elseif ($selectedPrice !== null && $selectedPrice !== '' && is_numeric($selectedPrice) && (float) $selectedPrice > 0) {
            $basePrice = (float) $selectedPrice;
        } else {
            $itemAmount = (float) ($itemData['amount'] ?? 0.0);
            $basePrice = $itemAmount > 0 ? $itemAmount : $maxPrice;
        }

        $maxPrice = max($maxPrice, $basePrice);
        $qty = max(1, (int) ($itemData['quantity'] ?? 1));

        $priceDiscountVal = max(0.0, $maxPrice - $basePrice);

        $ageDiscountType = $itemData['age_discount_type'] ?? null;
        $ageDiscountVal = 0.0;
        if ($ageDiscountType === 'third') {
            $ageDiscountVal = ($basePrice * $thirdAgePercent) / 100.0;
        } elseif ($ageDiscountType === 'fourth') {
            $ageDiscountVal = ($basePrice * $fourthAgePercent) / 100.0;
        }

        $additionalEnabled = ! empty($itemData['additional_discount_enabled']);
        $addDiscountVal = $additionalEnabled ? (float) ($itemData['additional_discount'] ?? 0.0) : 0.0;

        $totalDiscountPerUnit = $priceDiscountVal + $ageDiscountVal + $addDiscountVal;
        $totalDiscountVal = $totalDiscountPerUnit * $qty;

        $subtotalVal = max(0.0, ($maxPrice - $totalDiscountPerUnit) * $qty);
        $totalVal = $subtotalVal;

        return [
            'examination_id' => $examination?->id ?? ($itemData['examination_id'] ?? null),
            'quantity' => $qty,
            'amount' => $basePrice,
            'discount' => $totalDiscountVal,
            'subtotal' => $subtotalVal,
            'exempt_amount' => $totalVal,
            'taxable_amount_15' => 0.0,
            'taxable_amount_18' => 0.0,
            'isv_15' => 0.0,
            'isv_18' => 0.0,
            'total' => $totalVal,
            'selected_price' => $selectedPrice,
            'custom_specimen_price' => $customPrice,
            'additional_discount_enabled' => $additionalEnabled,
            'additional_discount' => $addDiscountVal,
            'age_discount_type' => $ageDiscountType,
            'age_discount_amount' => $ageDiscountVal * $qty,
        ];
    }

    /**
     * Calculate consolidated invoice totals from an array of calculated items.
     */
    public static function calculateConsolidatedTotals(array $calculatedItems, float $insumosTotal = 0.0, float $customAmount = 0.0): array
    {
        $totalQty = 0;
        $totalAmount = 0.0;
        $totalDiscount = 0.0;
        $totalSubtotal = 0.0;

        foreach ($calculatedItems as $item) {
            $totalQty += (int) ($item['quantity'] ?? 1);
            $totalAmount += (float) ($item['amount'] ?? 0.0) * (int) ($item['quantity'] ?? 1);
            $totalDiscount += (float) ($item['discount'] ?? 0.0);
            $totalSubtotal += (float) ($item['subtotal'] ?? 0.0);
        }

        $grandSubtotal = $totalSubtotal + $insumosTotal + $customAmount;
        $grandTotal = $grandSubtotal;

        return [
            'quantity' => $totalQty,
            'amount' => $totalAmount + $customAmount,
            'discount' => $totalDiscount,
            'subtotal' => $grandSubtotal,
            'exempt_amount' => $grandTotal,
            'taxable_amount_15' => 0.0,
            'taxable_amount_18' => 0.0,
            'isv_15' => 0.0,
            'isv_18' => 0.0,
            'total' => $grandTotal,
        ];
    }
}
