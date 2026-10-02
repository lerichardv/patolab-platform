<?php

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceSpecimen;
use App\Models\Location;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenExamination;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Services\InvoiceCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);
    $this->actingAs($this->user);

    $this->customer = Customer::create([
        'name' => 'Test Customer',
        'id_number' => '0801199012345',
        'phone' => '99999999',
        'gender' => 'mujer',
        'type' => 'individual',
    ]);

    $this->referrerType = ReferrerType::create(['name' => 'Tipo', 'active' => true]);
    $this->referrer = Referrer::create(['name' => 'Dr. Test', 'active' => true, 'referrer_type' => $this->referrerType->id]);
    $this->priority = Priority::create(['name' => 'Normal', 'color' => '#000000', 'order' => 1]);
    $this->category = SpecimenCategory::create(['name' => 'General', 'quantity' => 1, 'active' => true]);
    $this->type = SpecimenType::create(['name' => 'Biopsia', 'code' => 'BIO']);

    $this->examColon = SpecimenTypeExamination::create([
        'specimen_type' => $this->type->id,
        'name' => 'Biopsia Colonoscopica',
        'code' => 'BC1',
    ]);
    $this->examColon->prices()->create([
        'amount' => 1900.00,
        'description' => 'Normal',
    ]);

    $this->examGastric = SpecimenTypeExamination::create([
        'specimen_type' => $this->type->id,
        'name' => 'Biopsia Gastrica Endoscopica (1 Muestra)',
        'code' => 'BG1',
    ]);
    $this->examGastric->prices()->create([
        'amount' => 2500.00,
        'description' => 'Normal',
    ]);
});

test('calculateItem uses maxPrice as amount so amount minus discount equals subtotal', function () {
    $itemData = [
        'examination_id' => $this->examColon->id,
        'selected_price' => '1900.00',
        'quantity' => 2,
        'additional_discount_enabled' => true,
        'additional_discount' => 920.00,
    ];

    $calculated = InvoiceCalculationService::calculateItem($itemData, $this->examColon);

    expect($calculated['amount'])->toBe(1900.00)
        ->and($calculated['quantity'])->toBe(2)
        ->and($calculated['discount'])->toBe(1840.00)
        ->and($calculated['subtotal'])->toBe(1960.00)
        ->and(($calculated['amount'] * $calculated['quantity']) - $calculated['discount'])->toBe($calculated['subtotal']);
});

test('calculateConsolidatedTotals correctly calculates gross amount, discount, and separated exempt amounts', function () {
    $item1 = [
        'examination_id' => $this->examColon->id,
        'quantity' => 2,
        'amount' => 1900.00,
        'discount' => 1840.00,
        'subtotal' => 1960.00,
    ];

    $item2 = [
        'examination_id' => $this->examGastric->id,
        'quantity' => 1,
        'amount' => 2500.00,
        'discount' => 750.00,
        'subtotal' => 1750.00,
    ];

    $totals = InvoiceCalculationService::calculateConsolidatedTotals([$item1, $item2]);

    expect($totals['quantity'])->toBe(3)
        ->and($totals['amount'])->toBe(6300.00)
        ->and($totals['discount'])->toBe(2590.00)
        ->and($totals['subtotal'])->toBe(3710.00)
        ->and($totals['exempt_amount'])->toBe(3710.00)
        ->and($totals['tax_exempt_amount'])->toBe(0.00)
        ->and($totals['total'])->toBe(3710.00)
        ->and($totals['amount'] - $totals['discount'])->toBe($totals['subtotal']);
});

test('invoice PDF view renders itemized rows instead of summing unit prices into 4400', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-3102-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examColon->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ]);

    SpecimenExamination::create([
        'specimen_id' => $specimen->id,
        'examination_id' => $this->examColon->id,
    ]);
    SpecimenExamination::create([
        'specimen_id' => $specimen->id,
        'examination_id' => $this->examGastric->id,
    ]);

    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'created_by_id' => $this->user->id,
        'specimen_id' => $specimen->id,
        'payment_type' => 'cash',
        'full_invoice_number' => '000-001-01-00029960',
        'quantity' => 3,
        'amount' => 6300.00,
        'discount' => 2590.00,
        'subtotal' => 3710.00,
        'tax_exempt_amount' => 0.00,
        'exempt_amount' => 3710.00,
        'taxable_amount_15' => 0.00,
        'taxable_amount_18' => 0.00,
        'isv_15' => 0.00,
        'isv_18' => 0.00,
        'total' => 3710.00,
        'total_paid' => 3710.00,
        'invoice_file' => '',
        'invoice_date' => now(),
    ]);

    InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen->id,
        'examination_id' => $this->examColon->id,
        'quantity' => 2,
        'amount' => 1900.00,
        'discount' => 1840.00,
        'subtotal' => 1960.00,
        'additional_discount_enabled' => true,
        'additional_discount' => 920.00,
    ]);

    InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen->id,
        'examination_id' => $this->examGastric->id,
        'quantity' => 1,
        'amount' => 2500.00,
        'discount' => 750.00,
        'subtotal' => 1750.00,
        'age_discount_type' => 'third',
        'age_discount_amount' => 750.00,
    ]);

    $invoice->load([
        'specimen.products',
        'specimen.type',
        'specimen.examination.prices',
        'customer',
        'caiRange',
        'invoiceSpecimens.examination.prices',
        'invoiceSpecimens.specimen.customerRelation',
        'invoiceSpecimens.specimen.type',
        'invoiceSpecimens.specimen.products',
    ]);

    $customer = $invoice->customer;
    $caiRange = $invoice->caiRange;
    $location = Location::first();
    $totalWords = 'TRES MIL SETECIENTOS DIEZ LEMPIRAS';
    $examination = $this->examColon;

    $html = view('pdf.invoice', compact('invoice', 'caiRange', 'customer', 'examination', 'location', 'totalWords'))->render();

    // Verify 4,400.00 does not appear anywhere
    expect($html)->not->toContain('4,400.00')
        ->and($html)->toContain('Biopsia Colonoscopica')
        ->and($html)->toContain('Biopsia Gastrica Endoscopica (1 Muestra)')
        ->and($html)->toContain('1,900.00')
        ->and($html)->toContain('2,500.00')
        ->and($html)->toContain('1,960.00')
        ->and($html)->toContain('1,750.00')
        ->and($html)->toContain('6,300.00')
        ->and($html)->toContain('2,590.00')
        ->and($html)->toContain('3,710.00');
});
