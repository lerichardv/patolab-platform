<?php

use App\Models\Invoice;
use App\Services\BillingReconciliationService;
use Carbon\Carbon;

beforeEach(function () {
    $this->service = new BillingReconciliationService;
});

test('calculateInvoiceRow correctly handles cancelled invoices', function () {
    $invoice = new Invoice([
        'full_invoice_number' => '000-001-01-00000001',
        'invoice_type' => 'cancelled',
    ]);
    $invoice->id = 999;

    $row = $this->service->calculateInvoiceRow($invoice, 1, Carbon::parse('2026-09-26'));

    expect($row['is_cancelled'])->toBeTrue()
        ->and($row['customer_name'])->toBe('Anulada')
        ->and($row['gross_amount'])->toEqual(0.0)
        ->and($row['discount'])->toEqual(0.0)
        ->and($row['net_amount'])->toEqual(0.0)
        ->and($row['taxable_15'])->toEqual(0.0)
        ->and($row['exempt'])->toEqual(0.0)
        ->and($row['isv_15'])->toEqual(0.0)
        ->and($row['invoice_number'])->toBe('000-001-01-00000001');
});

test('calculateInvoiceRow calculates exempt invoice with discount without double discount deduction', function () {
    $invoice = new Invoice([
        'full_invoice_number' => '000-001-01-00029923',
        'payment_type' => 'card',
        'quantity' => 1,
        'amount' => 2900.0,
        'discount' => 870.0,
        'subtotal' => 2030.0,
        'exempt_amount' => 2030.0,
        'total' => 2030.0,
        'total_paid' => 2030.0,
        'pay_isv' => false,
        'invoice_type' => 'standard',
    ]);
    $invoice->id = 101;

    $row = $this->service->calculateInvoiceRow($invoice, 1, Carbon::parse('2026-09-26'));

    expect($row['is_cancelled'])->toBeFalse()
        ->and($row['payment_type_code'])->toBe(3) // card = 3 (T/C POS)
        ->and($row['payment_type_label'])->toBe('T/C POS')
        ->and($row['gross_amount'])->toEqual(2900.0) // 2030 net + 870 discount
        ->and($row['discount'])->toEqual(870.0)
        ->and($row['net_amount'])->toEqual(2030.0)
        ->and($row['exempt'])->toEqual(2900.0) // Pre-tax gross before discount
        ->and($row['taxable_15'])->toEqual(0.0)
        ->and($row['isv_15'])->toEqual(0.0);

    // Gravadas + Exentas - Descuento + IVA = Pago Recibido (Net)
    $formulaTotal = $row['taxable_15'] + $row['exempt'] - $row['discount'] + $row['isv_15'];
    expect($formulaTotal)->toEqual(2030.0)
        ->and($formulaTotal)->toEqual($row['net_amount']);
});

test('calculateInvoiceRow calculates taxable invoice with 15 percent ISV and discount accurately', function () {
    // Gross: 1000, Discount: 200, Net base: 800, ISV: 120, Total: 920
    $invoice = new Invoice([
        'full_invoice_number' => '000-001-01-00039901',
        'payment_type' => 'transfer',
        'quantity' => 1,
        'amount' => 1000.0,
        'discount' => 200.0,
        'subtotal' => 800.0,
        'taxable_amount_15' => 800.0,
        'isv_15' => 120.0,
        'total' => 920.0,
        'total_paid' => 920.0,
        'pay_isv' => true,
        'invoice_type' => 'rental',
    ]);
    $invoice->id = 202;

    $row = $this->service->calculateInvoiceRow($invoice, 2, Carbon::parse('2026-09-26'));

    expect($row['is_cancelled'])->toBeFalse()
        ->and($row['payment_type_code'])->toBe(4) // transfer = 4
        ->and($row['payment_type_label'])->toBe('Transferencia')
        ->and($row['gross_amount'])->toEqual(1120.0) // 920 net + 200 discount
        ->and($row['discount'])->toEqual(200.0)
        ->and($row['net_amount'])->toEqual(920.0)
        ->and($row['taxable_15'])->toEqual(1000.0) // Pre-tax gross (800 + 200)
        ->and($row['exempt'])->toEqual(0.0)
        ->and($row['isv_15'])->toEqual(120.0);

    // Gravadas + Exentas - Descuento + IVA = Pago Recibido (Net)
    $formulaTotal = $row['taxable_15'] + $row['exempt'] - $row['discount'] + $row['isv_15'];
    expect($formulaTotal)->toEqual(920.0)
        ->and($formulaTotal)->toEqual($row['net_amount']);
});

test('calculateDailySettlement aggregates daily invoices and calculates arqueo correctly', function () {
    $inv1 = new Invoice([
        'full_invoice_number' => '000-001-01-00000001',
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 1000.0,
        'discount' => 100.0,
        'subtotal' => 900.0,
        'exempt_amount' => 900.0,
        'total' => 900.0,
        'total_paid' => 900.0,
        'pay_isv' => false,
        'invoice_type' => 'standard',
    ]);
    $inv1->id = 1;

    $inv2 = new Invoice([
        'full_invoice_number' => '000-001-01-00000002',
        'payment_type' => 'card',
        'quantity' => 1,
        'amount' => 2000.0,
        'discount' => 0.0,
        'subtotal' => 2000.0,
        'exempt_amount' => 2000.0,
        'total' => 2000.0,
        'total_paid' => 2000.0,
        'pay_isv' => false,
        'invoice_type' => 'standard',
    ]);
    $inv2->id = 2;

    $inv3 = new Invoice([
        'full_invoice_number' => '000-001-01-00000003',
        'invoice_type' => 'cancelled',
    ]);
    $inv3->id = 3;

    $settlement = $this->service->calculateDailySettlement(Carbon::parse('2026-09-26'), [$inv1, $inv2, $inv3]);

    expect($settlement['invoice_count'])->toBe(3)
        ->and($settlement['active_count'])->toBe(2)
        ->and($settlement['cancelled_count'])->toBe(1)
        ->and($settlement['totals']['gross'])->toEqual(3000.0)
        ->and($settlement['totals']['discount'])->toEqual(100.0)
        ->and($settlement['totals']['net'])->toEqual(2900.0)
        ->and($settlement['settlement']['cash'])->toEqual(900.0)
        ->and($settlement['settlement']['card'])->toEqual(2000.0)
        ->and($settlement['settlement']['total'])->toEqual(2900.0)
        ->and($settlement['settlement']['difference'])->toEqual(0.0)
        ->and($settlement['settlement']['is_balanced'])->toBeTrue()
        ->and($settlement['first_invoice'])->toBe('000-001-01-00000001')
        ->and($settlement['last_invoice'])->toBe('000-001-01-00000003')
        ->and($settlement['total_sales'])->toEqual(2900.0);
});
