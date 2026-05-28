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

test('storing a specimen creates an invoice with Honduran tax exempt/exonerated rules', function () {
    $this->actingAs($this->user);

    $medicalOrderFile = UploadedFile::fake()->create('medical_order.pdf', 50, 'application/pdf');
    $proofOfPaymentFile = UploadedFile::fake()->create('payment_proof.pdf', 50, 'application/pdf');

    $response = $this->post(route('specimens.store'), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'anatomic_site' => 'Brazo izquierdo',
        'diagnosis' => 'Ninguno',
        'clinical_notes' => 'Paciente sin sintomas',
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'medical_order_file' => $medicalOrderFile,
        'amount' => 1500.00,
        'discount' => 100.00,
        'payment_type' => 'cash',
        'proof_of_payment' => $proofOfPaymentFile,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    // Verify Specimen was created
    $this->assertDatabaseHas('specimen', [
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'sequence_code' => 'BIO-0001-05-2026',
    ]);

    // Verify Invoice was created
    $this->assertDatabaseHas('invoices', [
        'customer_id' => $this->customer->id,
        'amount' => '1500.00',
        'discount' => '100.00',
        'subtotal' => '1400.00',
        'total' => '1400.00',
        'exempt_amount' => '0.00',
        'tax_exempt_amount' => '1400.00',
        'taxable_amount_15' => '0.00',
        'taxable_amount_18' => '0.00',
        'isv_15' => '0.00',
        'isv_18' => '0.00',
    ]);
});

test('storing a specimen with automatic discount calculation for specimen price and insumos', function () {
    $this->actingAs($this->user);

    // 1. Create a storage
    $storage = \App\Models\Storage::create([
        'name' => 'Bodega Central',
        'location' => 'San Pedro Sula',
        'description' => 'Bodega principal de reactivos',
        'active' => true,
    ]);

    // 2. Create a product with price lists
    $product = \App\Models\Product::create([
        'code' => 'TEST-INS-01',
        'name' => 'Test Insumo',
        'description' => 'Test Insumo Description',
        'unit' => 'unit',
        'unit_value' => '1',
        'purchase_price' => 10.00,
        'sale_price' => 20.00,
        'isv' => false,
        'active' => true,
    ]);

    // Regular price of the product is 30.00
    $product->prices()->create([
        'amount' => 30.00,
    ]);

    // 3. Create inventory for product
    \App\Models\Inventory::create([
        'storage' => $storage->id,
        'product' => $product->id,
        'quantity' => 10,
        'active' => true,
    ]);

    // 4. Set specimen type price list
    $this->specimenType->prices()->create([
        'amount' => 500.00,
    ]);

    $medicalOrderFile = UploadedFile::fake()->create('medical_order.pdf', 50, 'application/pdf');
    $proofOfPaymentFile = UploadedFile::fake()->create('payment_proof.pdf', 50, 'application/pdf');

    // Frontend would submit:
    // data.amount = maxSpecimenPrice (500) + customAmount (0) = 500
    // data.discount = specimenDiscount (500 - 400 = 100) = 100
    // data.insumos = [[id, price = 15, quantity = 2]]
    $response = $this->post(route('specimens.store'), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'anatomic_site' => 'Brazo izquierdo',
        'diagnosis' => 'Ninguno',
        'clinical_notes' => 'Paciente sin sintomas',
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'medical_order_file' => $medicalOrderFile,
        'amount' => 500.00,
        'discount' => 100.00,
        'payment_type' => 'cash',
        'proof_of_payment' => $proofOfPaymentFile,
        'insumos' => [
            [
                'id' => $product->id,
                'quantity' => 2,
                'price' => 15.00,
            ]
        ],
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    // Verify Specimen was created
    $specimen = \App\Models\Specimen::where('customer', $this->customer->id)
        ->where('specimen_type', $this->specimenType->id)
        ->first();
    expect($specimen)->not->toBeNull();

    // Verify products/insumos relation
    expect($specimen->products)->toHaveCount(1);
    expect((float)$specimen->products->first()->pivot->price)->toEqual(15.00);
    expect($specimen->products->first()->pivot->quantity)->toBe(2);

    // Verify inventory decremented: 10 - 2 = 8
    $this->assertDatabaseHas('inventory', [
        'product' => $product->id,
        'quantity' => 8,
    ]);

    // Verify Invoice was created
    // Expected math:
    // Amount: (float)amount_submitted (500.00) = 500.00
    // Discount: 100.00
    // Subtotal: 500.00 - 100.00 = 400.00
    $this->assertDatabaseHas('invoices', [
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimen->id,
        'amount' => '500.00',
        'discount' => '100.00',
        'subtotal' => '400.00',
        'total' => '400.00',
        'tax_exempt_amount' => '400.00',
    ]);
});

test('storing a specimen with custom additional amount saves the amount and reason in the invoice', function () {
    $this->actingAs($this->user);

    $medicalOrderFile = UploadedFile::fake()->create('medical_order.pdf', 50, 'application/pdf');
    $proofOfPaymentFile = UploadedFile::fake()->create('payment_proof.pdf', 50, 'application/pdf');

    $response = $this->post(route('specimens.store'), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'anatomic_site' => 'Brazo izquierdo',
        'diagnosis' => 'Ninguno',
        'clinical_notes' => 'Paciente sin sintomas',
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'medical_order_file' => $medicalOrderFile,
        'amount' => 2000.00,
        'discount' => 0.00,
        'payment_type' => 'cash',
        'proof_of_payment' => $proofOfPaymentFile,
        'custom_amount_enabled' => true,
        'custom_amount' => 1500.00,
        'custom_amount_reason' => 'Urgente / Domicilio',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    // Verify Specimen was created
    $specimen = \App\Models\Specimen::where('customer', $this->customer->id)
        ->where('specimen_type', $this->specimenType->id)
        ->first();
    expect($specimen)->not->toBeNull();

    // Verify Invoice was created with correct custom amount and reason
    $this->assertDatabaseHas('invoices', [
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimen->id,
        'amount' => '2000.00',
        'discount' => '0.00',
        'subtotal' => '2000.00',
        'total' => '2000.00',
        'custom_amount' => '1500.00',
        'custom_amount_reason' => 'Urgente / Domicilio',
    ]);
});

test('storing a specimen with credit type and no initial payment succeeds without proof_of_payment', function () {
    $this->actingAs($this->user);

    $medicalOrderFile = UploadedFile::fake()->create('medical_order.pdf', 50, 'application/pdf');

    $response = $this->post(route('specimens.store'), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'anatomic_site' => 'Brazo izquierdo',
        'diagnosis' => 'Ninguno',
        'clinical_notes' => 'Paciente sin sintomas',
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'medical_order_file' => $medicalOrderFile,
        'amount' => 1500.00,
        'discount' => 0.00,
        'payment_type' => 'credit',
        'has_initial_payment' => false,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $this->assertDatabaseHas('invoices', [
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'proof_of_payment' => 'Crédito',
    ]);
});

test('storing a specimen with credit type and initial payment requires proof_of_payment', function () {
    $this->actingAs($this->user);

    $medicalOrderFile = UploadedFile::fake()->create('medical_order.pdf', 50, 'application/pdf');

    // 1. Attempt storing without proof_of_payment file
    $response = $this->post(route('specimens.store'), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'anatomic_site' => 'Brazo izquierdo',
        'diagnosis' => 'Ninguno',
        'clinical_notes' => 'Paciente sin sintomas',
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'medical_order_file' => $medicalOrderFile,
        'amount' => 1500.00,
        'discount' => 0.00,
        'payment_type' => 'credit',
        'has_initial_payment' => true,
        'initial_payment_amount' => 500.00,
        'initial_payment_type' => 'cash',
    ]);

    $response->assertSessionHasErrors(['proof_of_payment']);

    // 2. Supply proof_of_payment file
    $proofOfPaymentFile = UploadedFile::fake()->create('payment_proof.pdf', 50, 'application/pdf');

    $response2 = $this->post(route('specimens.store'), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'anatomic_site' => 'Brazo izquierdo',
        'diagnosis' => 'Ninguno',
        'clinical_notes' => 'Paciente sin sintomas',
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'medical_order_file' => $medicalOrderFile,
        'amount' => 1500.00,
        'discount' => 0.00,
        'payment_type' => 'credit',
        'has_initial_payment' => true,
        'initial_payment_amount' => 500.00,
        'initial_payment_type' => 'cash',
        'proof_of_payment' => $proofOfPaymentFile,
    ]);

    $response2->assertRedirect();
    $response2->assertSessionHas('success');

    $this->assertDatabaseHas('invoices', [
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
    ]);
});

test('storing a specimen with credit type and initial payment requires initial_payment_amount and initial_payment_type', function () {
    $this->actingAs($this->user);

    $medicalOrderFile = UploadedFile::fake()->create('medical_order.pdf', 50, 'application/pdf');
    $proofOfPaymentFile = UploadedFile::fake()->create('payment_proof.pdf', 50, 'application/pdf');

    // Missing amount and type
    $response = $this->post(route('specimens.store'), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'anatomic_site' => 'Brazo izquierdo',
        'diagnosis' => 'Ninguno',
        'clinical_notes' => 'Paciente sin sintomas',
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'medical_order_file' => $medicalOrderFile,
        'amount' => 1500.00,
        'discount' => 0.00,
        'payment_type' => 'credit',
        'has_initial_payment' => true,
        'proof_of_payment' => $proofOfPaymentFile,
    ]);

    $response->assertSessionHasErrors(['initial_payment_amount', 'initial_payment_type']);
});

test('storing a specimen with credit type and initial payment amount larger than subtotal fails validation', function () {
    $this->actingAs($this->user);

    $medicalOrderFile = UploadedFile::fake()->create('medical_order.pdf', 50, 'application/pdf');
    $proofOfPaymentFile = UploadedFile::fake()->create('payment_proof.pdf', 50, 'application/pdf');

    // Amount larger than total (1500.00)
    $response = $this->post(route('specimens.store'), [
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'anatomic_site' => 'Brazo izquierdo',
        'diagnosis' => 'Ninguno',
        'clinical_notes' => 'Paciente sin sintomas',
        'status' => 'received',
        'priority_id' => $this->priority->id,
        'medical_order_file' => $medicalOrderFile,
        'amount' => 1500.00,
        'discount' => 0.00,
        'payment_type' => 'credit',
        'has_initial_payment' => true,
        'initial_payment_amount' => 2000.00,
        'initial_payment_type' => 'cash',
        'proof_of_payment' => $proofOfPaymentFile,
    ]);

    $response->assertSessionHasErrors(['initial_payment_amount']);
});

