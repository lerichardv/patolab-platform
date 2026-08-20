<?php

use App\Models\Bank;
use App\Models\CaiRange;
use App\Models\Credit;
use App\Models\Customer;
use App\Models\Invoice;
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
    $this->adminRole->permissions()->attach($managePermission);

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

test('submitting a final payment registers payment, updates credit, assigns invoice number and date, and regenerates PDF', function () {
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

    Storage::fake('public');
    $proof = UploadedFile::fake()->image('proof.jpg');

    // Act
    $response = $this->actingAs($this->user)->post(route('credits.pay-final', $credit->id), [
        'amount_paid' => 500.00,
        'specimens' => [
            ['id' => $specimen->id, 'quantity' => 1],
        ],
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    // Assert credit is paid off and status is invoice generated
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

    // Assert invoice was updated with CAI details and invoice_date
    $originalInvoice->refresh();
    expect($originalInvoice->invoice_number)->toEqual('00000001');
    expect($originalInvoice->full_invoice_number)->toEqual('000-001-01-00000001');
    expect($originalInvoice->invoice_date)->not->toBeNull();
    expect($originalInvoice->total_paid)->toEqual(500.00);
});

test('a credit with invoice generated status can be marked as paid with payment details and proof', function () {
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

    $originalInvoice->refresh();
    expect($originalInvoice->payment_type)->toEqual('bank transfer');
    expect($originalInvoice->transfer_authorization_code)->toEqual('TX12345');
    expect($originalInvoice->proof_of_payment)->not->toBeNull();
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

    // Credit status updated to invoice generated
    $credit->refresh();
    expect($credit->status)->toEqual('invoice generated');
});
