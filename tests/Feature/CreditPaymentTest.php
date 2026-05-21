<?php

use App\Models\User;
use App\Models\Customer;
use App\Models\Location;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\SpecimenCategory;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Priority;
use App\Models\CaiRange;
use App\Models\Sequence;
use App\Models\Invoice;
use App\Models\Credit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');

    $this->user = User::factory()->create();
    
    $this->customer = Customer::factory()->create();

    $this->location = Location::create([
        'name' => 'Sucursal Principal',
        'rtn' => '12345678901234',
        'address' => 'Tegucigalpa',
        'phone' => '2222-2222',
        'email' => 'principal@patolab.com',
        'active' => true,
    ]);

    $this->specimenType = SpecimenType::create([
        'name' => 'Biopsia',
        'description' => 'Muestra de biopsia',
        'active' => true,
    ]);

    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Biopsia Simple',
        'description' => 'Estudio simple',
        'active' => true,
    ]);

    $this->category = SpecimenCategory::create([
        'name' => 'Rutina',
        'unit' => 'days',
        'quantity' => 5,
        'active' => true,
    ]);

    $this->referrerType = ReferrerType::create([
        'name' => 'Médico Particular',
        'active' => true,
    ]);

    $this->referrer = Referrer::create([
        'name' => 'Dr. House',
        'referrer_type' => $this->referrerType->id,
        'active' => true,
    ]);

    $this->priority = Priority::create([
        'name' => 'Normal',
        'color' => '#00ff00',
        'order' => 1,
    ]);

    $this->caiRange = CaiRange::create([
        'location_id' => $this->location->id,
        'cai' => 'ABCDEF-123456-ABCDEF-123456-ABCDEF-12',
        'full_prefix' => '000-001-01-',
        'emission' => '2026-01-01',
        'establishment' => '000',
        'document_type' => 'factura',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'deadline' => '2027-01-01',
        'status' => 'active',
    ]);

    $this->sequence = Sequence::create([
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 4,
        'month' => 5,
        'year' => 2026,
        'current_sequence' => 1,
        'active' => true,
    ]);
});

test('guest cannot access credit pages', function () {
    $this->get(route('credits.index'))->assertRedirect(route('login'));
});

test('user can list credits', function () {
    $this->actingAs($this->user);

    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 1000.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 1000.00,
    ]);

    $response = $this->get(route('credits.index'));
    $response->assertOk();
});

test('user can register credit payment and generate payment invoice', function () {
    $this->actingAs($this->user);

    // 1. First, create a mock specimen to be the source of credit invoice
    $specimen = \App\Models\Specimen::create([
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'anatomic_site' => 'Brazo',
        'diagnosis' => 'Ninguno',
        'clinical_notes' => 'Paciente sin sintomas',
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'sequence_code' => 'BIO-0001-05-2026',
    ]);

    // 2. Create the credit record
    $credit = Credit::create([
        'customer_id' => $this->customer->id,
        'credit_amount' => 1200.00,
        'amount_paid' => 200.00,
        'amount_remaining' => 1000.00,
    ]);

    // 3. Create the original credit invoice
    $originalInvoice = Invoice::create([
        'full_invoice_number' => '000-001-01-00000001',
        'invoice_number' => '00000001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimen->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $credit->id,
        'amount' => 1200.00,
        'discount' => 0.00,
        'subtotal' => 1200.00,
        'total' => 1200.00,
        'proof_of_payment' => 'Crédito',
        'invoice_file' => 'invoices/original_mock.pdf',
    ]);

    // 4. Update CAI Range last used number
    $this->caiRange->update(['last_used_number' => 1]);

    // 5. Submit payment of L. 400
    $proofFile = UploadedFile::fake()->create('proof.jpg', 150, 'image/jpeg');

    $response = $this->post(route('credits.pay', $credit->id), [
        'amount_paid' => 400.00,
        'payment_type' => 'credit card',
        'proof_of_payment' => $proofFile,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');
    $response->assertSessionHas('new_invoice_id');
    $response->assertSessionHas('new_invoice_url');

    // 6. Verify credit model is updated: amount_paid = 200 + 400 = 600, amount_remaining = 1000 - 400 = 600
    $credit->refresh();
    expect((float)$credit->amount_paid)->toEqual(600.00);
    expect((float)$credit->amount_remaining)->toEqual(600.00);

    // 7. Verify new invoice is created
    $this->assertDatabaseHas('invoices', [
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimen->id,
        'payment_type' => 'credit card',
        'credit_payment_id' => $credit->id,
        'amount' => '400.00',
        'subtotal' => '400.00',
        'total' => '400.00',
        'invoice_number' => '00000002',
        'full_invoice_number' => '000-001-01-00000002',
    ]);

    // 8. Verify CAI Range last_used_number incremented: 1 + 1 = 2
    $this->caiRange->refresh();
    expect($this->caiRange->last_used_number)->toBe(2);

    // 9. Verify PDF invoice file was saved and registered
    $newInvoice = Invoice::where('full_invoice_number', '000-001-01-00000002')->first();
    expect($newInvoice->invoice_file)->not->toBeEmpty();
    
    // Check files stored in storage
    Storage::disk('public')->assertExists($newInvoice->proof_of_payment);
    Storage::disk('public')->assertExists($newInvoice->invoice_file);
});
