<?php

use App\Models\Bank;
use App\Models\CaiRange;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\Rental;
use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use App\Services\InvoiceCalculationService;
use App\Services\InvoicePdfService;
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
        'name' => 'Rental Customer',
        'id_number' => '0801199012345',
        'phone' => '99999999',
        'gender' => 'mujer',
        'type' => 'individual',
    ]);

    $this->rental = Rental::create([
        'name' => 'Alquiler de Auditorio',
        'description' => 'Uso por día',
    ]);

    $this->bank = Bank::create([
        'name' => 'Banco Atlántida',
    ]);

    $this->location = Location::create([
        'name' => 'Main Lab',
        'address' => '123 Main St',
        'active' => true,
        'rtn' => '08011990123456',
    ]);

    $this->caiRange = CaiRange::create([
        'location_id' => $this->location->id,
        'cai' => '123-456-789',
        'full_prefix' => '000-001-01-',
        'emission' => '000',
        'establishment' => '001',
        'document_type' => '01',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'deadline' => now()->addYear(),
        'status' => 'active',
    ]);

    Setting::create([
        'setting_key' => 'third_age_discount',
        'setting_value' => '30',
        'description' => 'Tercera Edad',
    ]);
    Setting::create([
        'setting_key' => 'fourth_age_discount',
        'setting_value' => '40',
        'description' => 'Cuarta Edad',
    ]);
});

test('rentals options endpoint returns rentals, banks, settings, and invoice data', function () {
    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'rental_id' => $this->rental->id,
        'invoice_type' => 'rental',
        'full_invoice_number' => '000-001-01-00000001',
        'invoice_number' => '00000001',
        'invoice_file' => 'invoices/test.pdf',
        'payment_type' => 'cash',
        'quantity' => 2,
        'amount' => 15000.00,
        'discount' => 0.00,
        'subtotal' => 30000.00,
        'taxable_amount_15' => 30000.00,
        'isv_15' => 4500.00,
        'total' => 34500.00,
        'total_paid' => 34500.00,
        'pay_isv' => true,
    ]);

    $response = $this->getJson(route('rentals.options', ['invoice_id' => $invoice->id]));

    $response->assertOk()
        ->assertJsonStructure([
            'rentals',
            'banks',
            'settings',
            'invoice',
        ]);

    expect($response->json('rentals'))->toHaveCount(1)
        ->and($response->json('banks'))->toHaveCount(1)
        ->and($response->json('settings.third_age_discount'))->toBe('30')
        ->and($response->json('invoice.id'))->toBe($invoice->id);
});

test('can update a rental invoice with quantity, custom amount, and isv without double counting', function () {
    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'rental_id' => $this->rental->id,
        'invoice_type' => 'rental',
        'full_invoice_number' => '000-001-01-00000001',
        'invoice_number' => '00000001',
        'invoice_file' => 'invoices/test.pdf',
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 10000.00,
        'discount' => 0.00,
        'subtotal' => 10000.00,
        'taxable_amount_15' => 10000.00,
        'isv_15' => 1500.00,
        'total' => 11500.00,
        'total_paid' => 11500.00,
        'pay_isv' => true,
    ]);

    // Update with quantity 2, unit amount 15000.00, custom_amount 500.00, discount 1000.00
    // rentalBase = 15000 * 2 = 30000.00
    // rentalSubtotal = 30000 - 1000 = 29000.00
    // isv15 = 29000 * 0.15 = 4350.00
    // subtotal = 29000 + 500 = 29500.00
    // total = 29500 + 4350 = 33850.00
    $response = $this->put(route('invoices.update', $invoice->id).'?regenerate_pdf=false', [
        'customer_id' => $this->customer->id,
        'rental_id' => $this->rental->id,
        'payment_type' => 'cash',
        'quantity' => 2,
        'amount' => 15000.00,
        'discount' => 1000.00,
        'subtotal' => 29500.00,
        'exempt_amount' => 0.00,
        'total' => 33850.00,
        'total_paid' => 33850.00,
        'custom_amount_enabled' => true,
        'custom_amount' => 500.00,
        'custom_amount_reason' => 'Limpieza',
        'pay_isv' => true,
        'description' => 'Edición de cobranza',
    ]);

    $response->assertRedirect();

    $invoice->refresh();

    expect((float) $invoice->amount)->toBe(15000.00)
        ->and($invoice->quantity)->toBe(2)
        ->and((float) $invoice->discount)->toBe(1000.00)
        ->and((float) $invoice->tax_exempt_amount)->toBe(500.00)
        ->and((float) $invoice->taxable_amount_15)->toBe(29000.00)
        ->and((float) $invoice->isv_15)->toBe(4350.00)
        ->and((float) $invoice->subtotal)->toBe(29500.00)
        ->and((float) $invoice->total)->toBe(33850.00)
        ->and($invoice->description)->toBe('Edición de cobranza');
});

test('updating rental invoice with regenerate_pdf=true triggers InvoicePdfService', function () {
    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'rental_id' => $this->rental->id,
        'invoice_type' => 'rental',
        'full_invoice_number' => '000-001-01-00000002',
        'invoice_number' => '00000002',
        'invoice_file' => 'invoices/original.pdf',
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 5000.00,
        'discount' => 0.00,
        'subtotal' => 5000.00,
        'taxable_amount_15' => 5000.00,
        'isv_15' => 750.00,
        'total' => 5750.00,
        'total_paid' => 5750.00,
        'pay_isv' => true,
    ]);

    $pdfServiceMock = Mockery::mock(InvoicePdfService::class);
    $pdfServiceMock->shouldReceive('generateAndStoreInvoice')
        ->once()
        ->with(Mockery::on(fn ($inv) => $inv->id === $invoice->id))
        ->andReturn('invoices/regenerated.pdf');
    app()->instance(InvoicePdfService::class, $pdfServiceMock);

    $response = $this->put(route('invoices.update', $invoice->id).'?regenerate_pdf=true', [
        'customer_id' => $this->customer->id,
        'rental_id' => $this->rental->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 6000.00,
        'discount' => 0.00,
        'subtotal' => 6000.00,
        'exempt_amount' => 0.00,
        'total' => 6900.00,
        'total_paid' => 6900.00,
        'pay_isv' => true,
    ]);

    $response->assertRedirect();
});

test('InvoiceCalculationService defaults payIsv to false and calculates ISV correctly for rentals', function () {
    // Default payIsv is false
    $calcWithoutIsv = InvoiceCalculationService::calculateRental([
        'amount' => 1000.00,
        'quantity' => 2,
        'discount' => 200.00,
        'custom_amount_enabled' => true,
        'custom_amount' => 100.00,
    ]);

    expect($calcWithoutIsv['pay_isv'])->toBeFalse()
        ->and($calcWithoutIsv['unit_price'])->toBe(1000.00)
        ->and($calcWithoutIsv['quantity'])->toBe(2)
        ->and($calcWithoutIsv['rental_subtotal'])->toBe(1800.00)
        ->and($calcWithoutIsv['subtotal'])->toBe(1900.00)
        ->and($calcWithoutIsv['isv_15'])->toBe(0.00)
        ->and($calcWithoutIsv['total'])->toBe(1900.00)
        ->and($calcWithoutIsv['exempt_amount'])->toBe(1800.00)
        ->and($calcWithoutIsv['tax_exempt_amount'])->toBe(100.00)
        ->and($calcWithoutIsv['taxable_amount_15'])->toBe(0.00);

    // Explicit payIsv = true
    $calcWithIsv = InvoiceCalculationService::calculateRental([
        'amount' => 1000.00,
        'quantity' => 2,
        'discount' => 200.00,
        'custom_amount_enabled' => true,
        'custom_amount' => 100.00,
    ], true);

    expect($calcWithIsv['pay_isv'])->toBeTrue()
        ->and($calcWithIsv['rental_subtotal'])->toBe(1800.00)
        ->and($calcWithIsv['subtotal'])->toBe(1900.00)
        ->and($calcWithIsv['isv_15'])->toBe(270.00) // 1800 * 0.15 = 270
        ->and($calcWithIsv['total'])->toBe(2170.00) // 1900 + 270 = 2170
        ->and($calcWithIsv['exempt_amount'])->toBe(0.00)
        ->and($calcWithIsv['tax_exempt_amount'])->toBe(100.00)
        ->and($calcWithIsv['taxable_amount_15'])->toBe(1800.00);
});

test('pdf.rental_invoice view contains rental item row and customer information', function () {
    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'rental_id' => $this->rental->id,
        'invoice_type' => 'rental',
        'full_invoice_number' => '000-001-01-00000003',
        'invoice_number' => '00000003',
        'invoice_file' => 'invoices/original.pdf',
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 25000.00,
        'discount' => 0.00,
        'subtotal' => 25000.00,
        'taxable_amount_15' => 25000.00,
        'isv_15' => 3750.00,
        'total' => 28750.00,
        'total_paid' => 28750.00,
        'pay_isv' => true,
        'description' => 'Alquiler de oficina #1',
    ]);

    $caiRange = $this->caiRange;
    $customer = $this->customer;
    $location = Location::first();
    $rental = $this->rental;
    $totalWords = app(InvoicePdfService::class)->numberToSpanishWords(28750.00);

    $html = view('pdf.rental_invoice', compact('invoice', 'caiRange', 'customer', 'location', 'totalWords', 'rental'))->render();

    expect($html)->toContain('Otro Cobro: '.$this->rental->name)
        ->and($html)->toContain('Alquiler de oficina #1')
        ->and($html)->toContain('25,000.00')
        ->and($html)->toContain($this->customer->name);
});
