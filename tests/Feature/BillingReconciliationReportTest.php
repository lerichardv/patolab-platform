<?php

use App\Http\Controllers\Reports\BillingReconciliationReportController;
use App\Models\CaiRange;
use App\Models\Credit;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\Permission;
use App\Models\Priority;
use App\Models\Rental;
use App\Models\Role;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\Reader\Xlsx;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Administrador']);
    $this->staffRole = Role::create(['slug' => 'staff', 'name' => 'Personal']);

    $this->viewPermission = Permission::create([
        'slug' => 'reports.billing_reconciliation.view',
        'name' => 'Ver Cuadre de Facturación',
    ]);
    $this->adminRole->permissions()->attach($this->viewPermission);

    $this->user = User::factory()->create([
        'name' => 'Admin User',
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    $this->customer = Customer::factory()->create(['name' => 'Test Customer']);
    $this->location = Location::create([
        'name' => 'Main Lab',
        'address' => '123 Main St',
        'active' => true,
    ]);
    $this->specimenType = SpecimenType::create(['name' => 'Biopsia', 'active' => true]);
    $this->category = SpecimenCategory::create(['name' => 'General', 'quantity' => 1]);
    $this->priority = Priority::create(['name' => 'Normal', 'color' => '#3b82f6', 'order' => 1, 'active' => true]);

    $this->caiRange = CaiRange::create([
        'location_id' => $this->location->id,
        'cai' => 'ABC-DEF',
        'full_prefix' => '000-001-01-',
        'emission' => '000',
        'establishment' => '001',
        'document_type' => '01',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'deadline' => '2027-12-31',
        'status' => 'active',
    ]);
});

test('unauthenticated user is redirected to login', function () {
    $this->get(route('reports.billing-reconciliation.index'))
        ->assertRedirect(route('login'));
});

test('user without view permission receives 403 forbidden', function () {
    $unprivilegedUser = User::factory()->create([
        'name' => 'Staff User',
        'role_id' => $this->staffRole->id,
        'active' => true,
    ]);

    $this->actingAs($unprivilegedUser)
        ->get(route('reports.billing-reconciliation.index'))
        ->assertForbidden();
});

test('user with permission can access the report page and deferred prop is configured', function () {
    $this->actingAs($this->user)
        ->get(route('reports.billing-reconciliation.index', [
            'date_from' => '2026-08-01',
            'date_to' => '2026-08-05',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/billing-reconciliation/index')
            ->has('filters')
            ->where('filters.date_from', '2026-08-01')
            ->where('filters.date_to', '2026-08-05')
        );
});

test('calculation excludes sundays strictly from daily tables', function () {
    // 2026-08-01 is Saturday
    // 2026-08-02 is Sunday
    // 2026-08-03 is Monday
    $satDate = '2026-08-01 10:00:00';
    $sunDate = '2026-08-02 10:00:00';
    $monDate = '2026-08-03 10:00:00';

    Invoice::create([
        'full_invoice_number' => '000-001-01-00001001',
        'invoice_number' => '00001001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'subtotal' => 1000.0,
        'discount' => 0.0,
        'total' => 1000.0,
        'total_paid' => 1000.0,
        'invoice_file' => 'invoices/test1.pdf',
        'invoice_date' => $satDate,
        'invoice_type' => 'standard',
    ]);

    Invoice::create([
        'full_invoice_number' => '000-001-01-00001002',
        'invoice_number' => '00001002',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'subtotal' => 500.0,
        'discount' => 0.0,
        'total' => 500.0,
        'total_paid' => 500.0,
        'invoice_file' => 'invoices/test2.pdf',
        'invoice_date' => $sunDate,
        'invoice_type' => 'standard',
    ]);

    Invoice::create([
        'full_invoice_number' => '000-001-01-00001003',
        'invoice_number' => '00001003',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'subtotal' => 1500.0,
        'discount' => 0.0,
        'total' => 1500.0,
        'total_paid' => 1500.0,
        'invoice_file' => 'invoices/test3.pdf',
        'invoice_date' => $monDate,
        'invoice_type' => 'standard',
    ]);

    $controller = app(BillingReconciliationReportController::class);
    $data = $controller->calculateReportData('2026-08-01', '2026-08-03');

    $dates = array_column($data['dailyTables'], 'date');

    expect($dates)->toContain('2026-08-01')
        ->and($dates)->toContain('2026-08-03')
        ->and($dates)->not->toContain('2026-08-02');
});

test('settlement block accurately groups payments by payment code and balances to 0.00', function () {
    $date = '2026-08-03 12:00:00';

    // 1 - Efectivo: L. 1,000
    Invoice::create([
        'full_invoice_number' => '000-001-01-00002001',
        'invoice_number' => '00002001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'subtotal' => 1200.0,
        'discount' => 200.0,
        'total' => 1000.0,
        'total_paid' => 1000.0,
        'invoice_file' => 'invoices/test1.pdf',
        'invoice_date' => $date,
        'invoice_type' => 'standard',
    ]);

    // 2 - Cheque: L. 2,500
    Invoice::create([
        'full_invoice_number' => '000-001-01-00002002',
        'invoice_number' => '00002002',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'check',
        'quantity' => 2,
        'subtotal' => 2500.0,
        'discount' => 0.0,
        'total' => 2500.0,
        'total_paid' => 2500.0,
        'invoice_file' => 'invoices/test2.pdf',
        'invoice_date' => $date,
        'invoice_type' => 'standard',
    ]);

    // 3 - T/C POS: L. 3,000
    Invoice::create([
        'full_invoice_number' => '000-001-01-00002003',
        'invoice_number' => '00002003',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit card',
        'quantity' => 1,
        'subtotal' => 3000.0,
        'discount' => 0.0,
        'total' => 3000.0,
        'total_paid' => 3000.0,
        'invoice_file' => 'invoices/test3.pdf',
        'invoice_date' => $date,
        'invoice_type' => 'standard',
    ]);

    // 4 - Transferencia: L. 1,500
    Invoice::create([
        'full_invoice_number' => '000-001-01-00002004',
        'invoice_number' => '00002004',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'bank transfer',
        'quantity' => 1,
        'subtotal' => 1500.0,
        'discount' => 0.0,
        'total' => 1500.0,
        'total_paid' => 1500.0,
        'invoice_file' => 'invoices/test4.pdf',
        'invoice_date' => $date,
        'invoice_type' => 'standard',
    ]);

    // 5 - Crédito: L. 4,000 (Paid credit with assigned invoice number)
    $paidCredit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 4000.0,
        'amount_paid' => 4000.0,
        'amount_remaining' => 0.0,
        'status' => 'paid',
    ]);

    Invoice::create([
        'full_invoice_number' => '000-001-01-00002005',
        'invoice_number' => '00002005',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $paidCredit->id,
        'quantity' => 3,
        'subtotal' => 4500.0,
        'discount' => 500.0,
        'total' => 4000.0,
        'total_paid' => 4000.0,
        'invoice_file' => 'invoices/test5.pdf',
        'invoice_date' => $date,
        'invoice_type' => 'standard',
    ]);

    $controller = app(BillingReconciliationReportController::class);
    $data = $controller->calculateReportData('2026-08-03', '2026-08-03');

    $dayTable = $data['dailyTables'][0];

    expect($dayTable['settlement']['cash'])->toEqual(1000.0)
        ->and($dayTable['settlement']['check'])->toEqual(2500.0)
        ->and($dayTable['settlement']['card'])->toEqual(3000.0)
        ->and($dayTable['settlement']['transfer'])->toEqual(1500.0)
        ->and($dayTable['settlement']['credit'])->toEqual(4000.0)
        ->and($dayTable['settlement']['total'])->toEqual(12000.0)
        ->and($dayTable['totals']['net'])->toEqual(12000.0)
        ->and($dayTable['settlement']['difference'])->toEqual(0.0)
        ->and($dayTable['settlement']['is_balanced'])->toBeTrue();
});

test('cancelled invoices are retained in sequence with zero amounts and anulada label', function () {
    $date = '2026-08-04 11:00:00';

    Invoice::create([
        'full_invoice_number' => '000-001-01-00003001',
        'invoice_number' => '00003001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'subtotal' => 1000.0,
        'discount' => 0.0,
        'total' => 1000.0,
        'total_paid' => 1000.0,
        'invoice_file' => 'invoices/test1.pdf',
        'invoice_date' => $date,
        'invoice_type' => 'standard',
    ]);

    Invoice::create([
        'full_invoice_number' => '000-001-01-00003002',
        'invoice_number' => '00003002',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 2,
        'subtotal' => 2000.0,
        'discount' => 0.0,
        'total' => 2000.0,
        'total_paid' => 0.0,
        'invoice_file' => 'invoices/test2.pdf',
        'invoice_date' => $date,
        'invoice_type' => 'cancelled',
    ]);

    $controller = app(BillingReconciliationReportController::class);
    $data = $controller->calculateReportData('2026-08-04', '2026-08-04');

    $dayTable = $data['dailyTables'][0];
    expect(count($dayTable['items']))->toBe(2);

    $cancelledItem = $dayTable['items'][1];
    expect($cancelledItem['customer_name'])->toBe('Anulada')
        ->and($cancelledItem['quantity'])->toBe(0)
        ->and($cancelledItem['gross_amount'])->toEqual(0.0)
        ->and($cancelledItem['discount'])->toEqual(0.0)
        ->and($cancelledItem['net_amount'])->toEqual(0.0)
        ->and($cancelledItem['comment'])->toBe('Factura Anulada')
        ->and($cancelledItem['is_cancelled'])->toBeTrue()
        ->and($dayTable['totals']['net'])->toEqual(1000.0)
        ->and($dayTable['settlement']['total'])->toEqual(1000.0)
        ->and($dayTable['settlement']['is_balanced'])->toBeTrue();
});

test('excel export returns binary xlsx file with status 200 and formatted payment methods', function () {
    Invoice::create([
        'full_invoice_number' => '000-001-01-00004001',
        'invoice_number' => '00004001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'subtotal' => 100.0,
        'discount' => 0.0,
        'total' => 100.0,
        'total_paid' => 100.0,
        'invoice_file' => 'invoices/test1.pdf',
        'invoice_date' => '2026-08-01 10:00:00',
        'invoice_type' => 'standard',
    ]);

    $rental = Rental::create(['name' => 'Alquiler Test', 'description' => 'Test']);
    Invoice::create([
        'full_invoice_number' => '000-001-01-00004002',
        'invoice_number' => '00004002',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'subtotal' => 200.0,
        'discount' => 0.0,
        'total' => 200.0,
        'total_paid' => 200.0,
        'invoice_file' => 'invoices/test2.pdf',
        'invoice_date' => '2026-08-01 10:00:00',
        'invoice_type' => 'rental',
        'rental_id' => $rental->id,
        'pay_isv' => true,
        'taxable_amount_15' => 200.0,
        'isv_15' => 30.0,
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('reports.billing-reconciliation.export', [
            'date_from' => '2026-08-01',
            'date_to' => '2026-08-01',
        ]));

    $response->assertOk()
        ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    $content = $response->streamedContent();
    $tempFile = tempnam(sys_get_temp_dir(), 'excel_test');
    file_put_contents($tempFile, $content);

    $reader = new Xlsx;
    $spreadsheet = $reader->load($tempFile);

    expect($spreadsheet->getSheetCount())->toBe(3);

    // Sheet 0: Ventas (Daily liquidation tables)
    $sheetVentas = $spreadsheet->getSheet(0);
    expect($sheetVentas->getTitle())->toBe('Ventas 0826')
        ->and($sheetVentas->getCell('F4')->getValue())->toBe('Efectivo (1)');

    // Sheet 1: Liquidación (Continuous invoices list)
    $sheetLiquidacion = $spreadsheet->getSheet(1);
    expect($sheetLiquidacion->getTitle())->toBe('Liquidación')
        ->and($sheetLiquidacion->getCell('B3')->getValue())->toBe('ITEM')
        ->and($sheetLiquidacion->getCell('D3')->getValue())->toBe('No. de Factura')
        ->and($sheetLiquidacion->getCell('D4')->getValue())->toBe('000-001-01-00004001')
        ->and($sheetLiquidacion->getCell('J4')->getValue())->toBe('=+F4+G4+I4-H4');

    // Sheet 2: Resumen (Period summary per day)
    $sheetResumen = $spreadsheet->getSheet(2);
    expect($sheetResumen->getTitle())->toBe('Resumen')
        ->and($sheetResumen->getCell('A4')->getValue())->toBe('Fecha')
        ->and($sheetResumen->getCell('B4')->getValue())->toBe('No. de Fact')
        ->and($sheetResumen->getCell('B5')->getValue())->toBe('000-001-01-00004001')
        ->and($sheetResumen->getCell('C5')->getValue())->toBe('000-001-01-00004002')
        ->and($sheetResumen->getCell('H5')->getValue())->toBe('=+E5*0.15');

    unlink($tempFile);
});

test('only invoices with assigned invoice number and paid status appear on the report', function () {
    $date = '2026-08-05 10:00:00';

    // 1. Direct cash invoice WITH invoice number -> MUST APPEAR
    $inv1 = Invoice::create([
        'full_invoice_number' => '000-001-01-00003001',
        'invoice_number' => '00003001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'subtotal' => 100.0,
        'discount' => 0.0,
        'total' => 100.0,
        'total_paid' => 100.0,
        'invoice_file' => 'invoices/test1.pdf',
        'invoice_date' => $date,
        'invoice_type' => 'standard',
    ]);

    // 2. Invoice with NO invoice number (null) -> MUST BE EXCLUDED
    Invoice::create([
        'full_invoice_number' => null,
        'invoice_number' => null,
        'cai_range_id' => null,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'subtotal' => 200.0,
        'discount' => 0.0,
        'total' => 200.0,
        'total_paid' => 200.0,
        'invoice_file' => 'invoices/test2.pdf',
        'invoice_date' => $date,
        'invoice_type' => 'standard',
    ]);

    // 3. Invoice with empty invoice number ('') -> MUST BE EXCLUDED
    Invoice::create([
        'full_invoice_number' => '',
        'invoice_number' => '',
        'cai_range_id' => null,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'subtotal' => 300.0,
        'discount' => 0.0,
        'total' => 300.0,
        'total_paid' => 300.0,
        'invoice_file' => 'invoices/test3.pdf',
        'invoice_date' => $date,
        'invoice_type' => 'standard',
    ]);

    // 4. Invoice with credit in 'pending' status -> MUST BE EXCLUDED
    $pendingCredit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 500.0,
        'amount_paid' => 0.0,
        'amount_remaining' => 500.0,
        'status' => 'pending',
    ]);

    Invoice::create([
        'full_invoice_number' => '000-001-01-00003004',
        'invoice_number' => '00003004',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $pendingCredit->id,
        'quantity' => 1,
        'subtotal' => 500.0,
        'discount' => 0.0,
        'total' => 500.0,
        'total_paid' => 0.0,
        'invoice_file' => 'invoices/test4.pdf',
        'invoice_date' => $date,
        'invoice_type' => 'standard',
    ]);

    // 5. Invoice with credit in 'partial' status -> MUST BE EXCLUDED
    $partialCredit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 600.0,
        'amount_paid' => 300.0,
        'amount_remaining' => 300.0,
        'status' => 'partial',
    ]);

    Invoice::create([
        'full_invoice_number' => '000-001-01-00003005',
        'invoice_number' => '00003005',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $partialCredit->id,
        'quantity' => 1,
        'subtotal' => 600.0,
        'discount' => 0.0,
        'total' => 600.0,
        'total_paid' => 300.0,
        'invoice_file' => 'invoices/test5.pdf',
        'invoice_date' => $date,
        'invoice_type' => 'standard',
    ]);

    // 6. Invoice with credit in 'paid' status WITH invoice number -> MUST APPEAR
    $paidCredit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 700.0,
        'amount_paid' => 700.0,
        'amount_remaining' => 0.0,
        'status' => 'paid',
    ]);

    $inv6 = Invoice::create([
        'full_invoice_number' => '000-001-01-00003006',
        'invoice_number' => '00003006',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $paidCredit->id,
        'quantity' => 1,
        'subtotal' => 700.0,
        'discount' => 0.0,
        'total' => 700.0,
        'total_paid' => 700.0,
        'invoice_file' => 'invoices/test6.pdf',
        'invoice_date' => $date,
        'invoice_type' => 'standard',
    ]);

    $controller = app(BillingReconciliationReportController::class);
    $data = $controller->calculateReportData('2026-08-05', '2026-08-05');

    $dayTable = $data['dailyTables'][0];
    // Only inv1 and inv6 should appear (2 invoices)
    expect(count($dayTable['items']))->toBe(2);

    $invoiceNumbers = array_column($dayTable['items'], 'invoice_number');
    expect($invoiceNumbers)->toContain('000-001-01-00003001')
        ->and($invoiceNumbers)->toContain('000-001-01-00003006')
        ->and($invoiceNumbers)->not->toContain('000-001-01-00003004')
        ->and($invoiceNumbers)->not->toContain('000-001-01-00003005');

    // Also assert generalInvoices contains the continuous invoice list with tax fields
    expect($data)->toHaveKey('generalInvoices')
        ->and(count($data['generalInvoices']))->toBe(2)
        ->and($data['generalInvoices'][0]['taxable_15'])->toBe(0.0)
        ->and($data['generalInvoices'][0]['exempt'])->toBe(100.0)
        ->and($data['generalInvoices'][0]['isv_15'])->toBe(0.0);
});

test('resumenRows includes all month working days without sundays with first and last invoice correlatives and total per day', function () {
    // 2026-08-06 is Thursday, 2026-08-07 is Friday, 2026-08-08 is Saturday, 2026-08-09 is Sunday, 2026-08-10 is Monday
    $date = '2026-08-06 10:00:00';

    // 1. First invoice on Thursday
    Invoice::create([
        'full_invoice_number' => '000-001-01-00005001',
        'invoice_number' => '00005001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'subtotal' => 150.0,
        'discount' => 0.0,
        'total' => 150.0,
        'total_paid' => 150.0,
        'invoice_file' => 'invoices/test5001.pdf',
        'invoice_date' => $date,
        'invoice_type' => 'standard',
    ]);

    // 2. Second invoice on Thursday
    Invoice::create([
        'full_invoice_number' => '000-001-01-00005002',
        'invoice_number' => '00005002',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'transfer',
        'quantity' => 1,
        'subtotal' => 450.0,
        'discount' => 50.0,
        'total' => 467.5,
        'total_paid' => 467.5,
        'invoice_file' => 'invoices/test5002.pdf',
        'invoice_date' => $date,
        'invoice_type' => 'rental',
        'pay_isv' => true,
        'taxable_amount_15' => 450.0,
        'isv_15' => 67.5,
    ]);

    $controller = app(BillingReconciliationReportController::class);
    // Range from Thursday 2026-08-06 to Monday 2026-08-10 (includes Sunday 2026-08-09)
    $data = $controller->calculateReportData('2026-08-06', '2026-08-10');

    // Should have 4 working days: Thursday (06), Friday (07), Saturday (08), Monday (10). Sunday (09) excluded!
    expect($data)->toHaveKey('resumenRows')
        ->and(count($data['resumenRows']))->toBe(4);

    $dates = array_column($data['resumenRows'], 'date');
    expect($dates)->toContain('2026-08-06')
        ->and($dates)->toContain('2026-08-07')
        ->and($dates)->toContain('2026-08-08')
        ->and($dates)->toContain('2026-08-10')
        ->and($dates)->not->toContain('2026-08-09'); // Sunday strictly excluded

    // Thursday has 2 invoices with first and last correlatives
    $thursdayRow = $data['resumenRows'][0];
    expect($thursdayRow['date'])->toBe('2026-08-06')
        ->and($thursdayRow['start_invoice'])->toBe('000-001-01-00005001')
        ->and($thursdayRow['end_invoice'])->toBe('000-001-01-00005002')
        ->and($thursdayRow['taxable_15'])->toBe(450.0)
        ->and($thursdayRow['exempt'])->toBe(150.0)
        ->and($thursdayRow['discount'])->toBe(50.0)
        ->and($thursdayRow['isv_15'])->toBe(67.5)
        ->and($thursdayRow['total'])->toBe(617.5)
        ->and($thursdayRow['has_invoices'])->toBeTrue();

    // Friday has no invoices
    $fridayRow = $data['resumenRows'][1];
    expect($fridayRow['date'])->toBe('2026-08-07')
        ->and($fridayRow['start_invoice'])->toBe('-')
        ->and($fridayRow['end_invoice'])->toBe('-')
        ->and($fridayRow['total'])->toBe(0.0)
        ->and($fridayRow['has_invoices'])->toBeFalse();
});

test('report defaults to current month date range when visited without date parameters', function () {
    $expectedFrom = Carbon\Carbon::today()->startOfMonth()->toDateString();
    $expectedTo = Carbon\Carbon::today()->toDateString();

    $this->actingAs($this->user)
        ->get(route('reports.billing-reconciliation.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/billing-reconciliation/index')
            ->where('filters.date_from', $expectedFrom)
            ->where('filters.date_to', $expectedTo)
        );
});
