<?php

use App\Models\Bank;
use App\Models\CaiRange;
use App\Models\Credit;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceSpecimen;
use App\Models\Location;
use App\Models\Permission;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Services\InvoicePdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->bank = Bank::create(['name' => 'BAC Credomatic']);
    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    $managePermission = Permission::create(['slug' => 'credits.manage', 'name' => 'Gestionar Créditos']);
    $manageInvoicesPermission = Permission::create(['slug' => 'invoices.manage', 'name' => 'Gestionar Facturas']);
    $this->adminRole->permissions()->attach([$managePermission->id, $manageInvoicesPermission->id]);

    $this->customer = Customer::create([
        'name' => 'Test Customer',
        'id_number' => '0801199012345',
        'phone' => '99999999',
        'gender' => 'mujer',
        'type' => 'individual',
    ]);

    $this->referrerType = ReferrerType::create(['name' => 'Tipo', 'active' => true]);
    $this->referrer = Referrer::create(['name' => 'Dr. House', 'active' => true, 'referrer_type' => $this->referrerType->id]);
    $this->priority = Priority::create(['name' => 'Normal', 'color' => '#000000', 'order' => 1]);
    $this->category = SpecimenCategory::create(['name' => 'General', 'quantity' => 1, 'active' => true]);
    $this->type = SpecimenType::create(['name' => 'BIO', 'code' => 'BIO', 'active' => true]);
    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->type->id,
        'name' => 'Examen Simple',
        'code' => 'EX1',
    ]);

    $this->location = Location::create([
        'name' => 'Main Lab',
        'address' => '123 Main St',
        'active' => true,
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
        'deadline' => '2028-12-31',
        'status' => 'active',
    ]);
});

test('submitting a final payment assigns CAI invoice number, updates status to invoice generated, and settles remaining balance', function () {
    // 1. Create specimen & original credit invoice
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'quantity' => 1,
    ]);

    // 2. Create credit record
    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 500.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 500.00,
        'is_group' => true,
    ]);

    $originalInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $credit->id,
        'total' => 500.00,
        'total_paid' => 0.00,
        'invoice_file' => 'invoices/original.pdf',
    ]);

    // Insert specimen group association
    DB::table('invoice_specimens')->insert([
        'credit_id' => $credit->id,
        'invoice_id' => $originalInvoice->id,
        'specimen_id' => $specimen->id,
        'is_paid' => 0,
        'amount' => 500.00,
        'discount' => 0.00,
        'subtotal' => 500.00,
        'total' => 500.00,
        'quantity' => 1,
        'quantity_paid' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Mock PDF Service
    $pdfServiceMock = Mockery::mock(InvoicePdfService::class);
    $pdfServiceMock->shouldReceive('generateAndStoreInvoice')->once();
    app()->instance(InvoicePdfService::class, $pdfServiceMock);

    // Act
    $response = $this->actingAs($this->user)->post(route('credits.pay-final', $credit->id), [
        'amount_paid' => 500.00,
        'specimens' => [
            ['id' => $specimen->id, 'quantity' => 1],
        ],
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    // Assert credit status is invoice generated and balance is settled
    $credit->refresh();
    expect($credit->amount_paid)->toEqual(500.00);
    expect($credit->amount_remaining)->toEqual(0.00);
    expect($credit->status)->toEqual('invoice generated');

    // Assert specimens are marked as paid
    $specimenRecord = DB::table('invoice_specimens')
        ->where('credit_id', $credit->id)
        ->where('specimen_id', $specimen->id)
        ->first();
    expect($specimenRecord->is_paid)->toEqual(1);
    expect($specimenRecord->quantity_paid)->toEqual(1);

    // Assert invoice was updated with CAI details and invoice_date, and total_paid is 500
    $originalInvoice->refresh();
    expect($originalInvoice->invoice_number)->toEqual('00000001');
    expect($originalInvoice->full_invoice_number)->toEqual('000-001-01-00000001');
    expect($originalInvoice->invoice_date)->not->toBeNull();
    expect($originalInvoice->payment_type)->toEqual('credit');
    expect($originalInvoice->total_paid)->toEqual(500.00);
});

test('a credit with invoice generated status can be marked as paid with payment details and proof, liquidating the balance', function () {
    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 500.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 500.00,
        'status' => 'invoice generated',
    ]);

    $originalInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $credit->id,
        'total' => 500.00,
        'total_paid' => 0.00,
        'invoice_file' => 'invoices/original.pdf',
    ]);

    // Mock PDF Service
    $pdfServiceMock = Mockery::mock(InvoicePdfService::class);
    $pdfServiceMock->shouldReceive('generateAndStoreInvoice')->once();
    app()->instance(InvoicePdfService::class, $pdfServiceMock);

    Storage::fake('public');
    $proof = UploadedFile::fake()->image('proof.jpg');

    $response = $this->actingAs($this->user)->post(route('credits.mark-as-paid', $credit->id), [
        'payment_type' => 'bank transfer',
        'payment_method_date' => now()->format('Y-m-d'),
        'transfer_bank_id' => $this->bank->id,
        'transfer_value' => 500.00,
        'transfer_authorization_code' => 'TX12345',
        'proof_of_payment' => $proof,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $credit->refresh();
    expect($credit->status)->toEqual('paid');
    expect($credit->amount_paid)->toEqual(500.00);
    expect($credit->amount_remaining)->toEqual(0.00);

    $originalInvoice->refresh();
    expect($originalInvoice->payment_type)->toEqual('bank transfer');
    expect($originalInvoice->total_paid)->toEqual(500.00);
    expect($originalInvoice->transfer_authorization_code)->toEqual('TX12345');
    expect($originalInvoice->proof_of_payment)->not->toBeNull();
});

test('markAsPaid fails validation when payment_type is credit', function () {
    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 500.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 500.00,
        'status' => 'invoice generated',
    ]);

    $response = $this->actingAs($this->user)->post(route('credits.mark-as-paid', $credit->id), [
        'payment_type' => 'credit',
        'payment_method_date' => now()->format('Y-m-d'),
    ]);

    $response->assertSessionHasErrors(['payment_type']);
});

test('payFinal does not regenerate invoice number if invoice already has one assigned', function () {
    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 500.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 500.00,
        'status' => 'pending',
    ]);

    $originalInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $credit->id,
        'total' => 500.00,
        'total_paid' => 0.00,
        'cai_range_id' => $this->caiRange->id,
        'invoice_number' => '00000099',
        'full_invoice_number' => '000-001-01-00000099',
        'invoice_file' => 'invoices/existing.pdf',
    ]);

    $caiLastUsedBefore = $this->caiRange->last_used_number;

    $pdfServiceMock = Mockery::mock(InvoicePdfService::class);
    $pdfServiceMock->shouldReceive('generateAndStoreInvoice')->once();
    app()->instance(InvoicePdfService::class, $pdfServiceMock);

    $response = $this->actingAs($this->user)->post(route('credits.pay-final', $credit->id), [
        'amount_paid' => 500.00,
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    // Check CAI was NOT incremented
    $this->caiRange->refresh();
    expect($this->caiRange->last_used_number)->toEqual($caiLastUsedBefore);

    // Check original invoice kept its numbers
    $originalInvoice->refresh();
    expect($originalInvoice->invoice_number)->toEqual('00000099');
    expect($originalInvoice->full_invoice_number)->toEqual('000-001-01-00000099');
    expect($originalInvoice->cai_range_id)->toEqual($this->caiRange->id);
    expect($originalInvoice->total_paid)->toEqual(500.00);

    // Credit status updated to invoice generated and balance remaining is 0
    $credit->refresh();
    expect($credit->status)->toEqual('invoice generated');
    expect($credit->amount_remaining)->toEqual(0.00);
    expect($credit->amount_paid)->toEqual(500.00);
});

test('payFinal prevents duplicate invoice generation if credit is already invoice generated', function () {
    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 500.00,
        'amount_paid' => 500.00,
        'amount_remaining' => 0.00,
        'status' => 'invoice generated',
    ]);

    $originalInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $credit->id,
        'total' => 500.00,
        'total_paid' => 500.00,
        'cai_range_id' => $this->caiRange->id,
        'invoice_number' => '00000099',
        'full_invoice_number' => '000-001-01-00000099',
        'invoice_file' => 'invoices/existing.pdf',
    ]);

    $response = $this->actingAs($this->user)->post(route('credits.pay-final', $credit->id), [
        'amount_paid' => 500.00,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('error', 'La factura final de crédito ya ha sido generada previamente.');
});

test('updating a credit payment invoice to payment_type credit fails validation', function () {
    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 500.00,
        'amount_paid' => 200.00,
        'amount_remaining' => 300.00,
        'status' => 'partial',
    ]);

    $paymentInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'invoice_type' => 'credit payment',
        'payment_type' => 'cash',
        'credit_payment_id' => $credit->id,
        'total' => 200.00,
        'total_paid' => 200.00,
        'invoice_file' => 'invoices/payment.pdf',
    ]);

    $response = $this->actingAs($this->user)->put(route('invoices.update', $paymentInvoice->id), [
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'quantity' => 1,
        'amount' => 200.00,
        'discount' => 0.00,
        'subtotal' => 200.00,
        'exempt_amount' => 200.00,
        'total' => 200.00,
        'total_paid' => 200.00,
    ]);

    $response->assertSessionHasErrors(['payment_type']);
});

test('invoices index loads complete credit relation fields and specimens for credit invoices', function () {
    $viewInvoicesPermission = Permission::create(['slug' => 'invoices.view', 'name' => 'Ver Facturas']);
    $this->adminRole->permissions()->attach($viewInvoicesPermission);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0002-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'quantity' => 1,
    ]);

    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 600.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 600.00,
        'is_group' => true,
        'status' => 'pending',
    ]);

    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $credit->id,
        'total' => 600.00,
        'total_paid' => 0.00,
        'invoice_file' => 'invoices/test.pdf',
    ]);

    InvoiceSpecimen::create([
        'credit_id' => $credit->id,
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen->id,
        'examination_id' => $this->examination->id,
        'is_group' => true,
        'quantity' => 1,
        'amount' => 600.00,
        'discount' => 0.00,
        'subtotal' => 600.00,
        'total' => 600.00,
        'selected_price' => '600.00',
    ]);

    $response = $this->actingAs($this->user)->get(route('invoices.index'));
    $response->assertOk();

    $invoicesProp = $response->viewData('page')['props']['invoices'];
    $data = isset($invoicesProp['data']) ? $invoicesProp['data'] : $invoicesProp;
    $loadedInvoice = collect($data)->firstWhere('id', $invoice->id);

    expect($loadedInvoice)->not->toBeNull();
    expect($loadedInvoice['credit_relation'])->not->toBeNull();
    expect($loadedInvoice['credit_relation']['is_group'])->toBeTrue();
    expect($loadedInvoice['credit_relation']['credit_invoice_specimens'])->toBeArray();
    expect(count($loadedInvoice['credit_relation']['credit_invoice_specimens']))->toBeGreaterThanOrEqual(1);
});

test('markAsPaid is rejected if credit status is pending (must generate final invoice first)', function () {
    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 500.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 500.00,
        'status' => 'pending',
    ]);

    Invoice::create([
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $credit->id,
        'total' => 500.00,
        'total_paid' => 0.00,
        'invoice_file' => 'invoices/original.pdf',
    ]);

    $response = $this->actingAs($this->user)->post(route('credits.mark-as-paid', $credit->id), [
        'payment_type' => 'cash',
        'payment_method_date' => now()->format('Y-m-d'),
        'cash_value' => 500.00,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('error', 'El crédito debe tener su factura final generada antes de marcarse como pagado.');

    $credit->refresh();
    expect($credit->status)->toEqual('pending');
});

test('payFinal preserves existing invoice number when already present and allows subsequent markAsPaid', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0099-08-2026',
        'customer' => $this->customer->id,
        'specimen_type' => $this->type->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'is_group' => false,
    ]);

    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 800.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 800.00,
        'specimen_id' => $specimen->id,
        'status' => 'pending',
    ]);

    $originalInvoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimen->id,
        'invoice_number' => '00030184',
        'full_invoice_number' => '000-001-01-00030184',
        'cai_range_id' => $this->caiRange->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $credit->id,
        'total' => 800.00,
        'total_paid' => 0.00,
        'invoice_file' => 'invoices/existing.pdf',
    ]);

    InvoiceSpecimen::create([
        'credit_id' => $credit->id,
        'invoice_id' => $originalInvoice->id,
        'specimen_id' => $specimen->id,
        'examination_id' => $this->examination->id,
        'quantity' => 1,
        'amount' => 800.00,
        'discount' => 0.00,
        'subtotal' => 800.00,
        'total' => 800.00,
        'selected_price' => '800.00',
    ]);

    $pdfServiceMock = Mockery::mock(InvoicePdfService::class);
    $pdfServiceMock->shouldReceive('generateAndStoreInvoice')->twice();
    app()->instance(InvoicePdfService::class, $pdfServiceMock);

    // 1. Pay final invoice - must keep existing invoice number
    $response = $this->actingAs($this->user)->post(route('credits.pay-final', $credit->id), [
        'specimens' => [
            ['id' => $specimen->id, 'quantity' => 1],
        ],
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $originalInvoice->refresh();
    expect($originalInvoice->invoice_number)->toEqual('00030184');
    expect($originalInvoice->full_invoice_number)->toEqual('000-001-01-00030184');

    $credit->refresh();
    expect($credit->status)->toEqual('invoice generated');

    // 2. Mark as paid - allowed once invoice is generated
    $response2 = $this->actingAs($this->user)->post(route('credits.mark-as-paid', $credit->id), [
        'payment_type' => 'cash',
        'payment_method_date' => now()->format('Y-m-d'),
        'cash_value' => 800.00,
    ]);

    $response2->assertRedirect();
    $response2->assertSessionHas('success');

    $credit->refresh();
    expect($credit->status)->toEqual('paid');
    expect($credit->amount_remaining)->toEqual(0.00);
});
