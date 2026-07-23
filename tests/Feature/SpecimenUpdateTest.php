<?php

use App\Models\CaiRange;
use App\Models\Credit;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Sequence;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenReport;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\SpecimenTypeTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

test('specimen sequence code and current sequence update when specimen type is changed', function () {
    // 1. Setup role and permissions
    $editRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    // Give all permissions (or bypass with Gate/auth)
    Gate::define('specimens.edit', fn () => true);

    $user = User::factory()->create([
        'role_id' => $editRole->id,
        'active' => true,
    ]);

    $customer = Customer::factory()->create();

    $location = Location::create([
        'name' => 'Principal',
        'address' => 'Dirección',
        'active' => true,
    ]);

    $type1 = SpecimenType::create([
        'name' => 'Biopsia',
        'active' => true,
    ]);

    $type2 = SpecimenType::create([
        'name' => 'Citología',
        'active' => true,
    ]);

    $sequence1 = Sequence::create([
        'location_id' => $location->id,
        'specimen_type' => $type1->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 4,
        'month' => 7,
        'year' => 2026,
        'current_sequence' => 1,
        'active' => true,
    ]);

    $sequence2 = Sequence::create([
        'location_id' => $location->id,
        'specimen_type' => $type2->id,
        'prefix' => 'CYT',
        'separator' => '-',
        'fill' => 4,
        'month' => 7,
        'year' => 2026,
        'current_sequence' => 5,
        'active' => true,
    ]);

    $examination1 = SpecimenTypeExamination::create([
        'specimen_type' => $type1->id,
        'name' => 'Examen 1',
        'code' => 'EX1',
        'description' => 'Desc 1',
        'active' => true,
    ]);

    $examination2 = SpecimenTypeExamination::create([
        'specimen_type' => $type2->id,
        'name' => 'Examen 2',
        'code' => 'EX2',
        'description' => 'Desc 2',
        'active' => true,
    ]);

    $category = SpecimenCategory::create([
        'name' => 'Categoría',
        'quantity' => 1,
        'active' => true,
    ]);

    $referrerType = ReferrerType::create([
        'name' => 'Tipo de Referente',
        'active' => true,
    ]);

    $referrer = Referrer::create([
        'name' => 'Referente',
        'referrer_type' => $referrerType->id,
        'active' => true,
    ]);

    $priority = Priority::create([
        'name' => 'Baja',
        'color' => '#10b981',
        'order' => 3,
        'active' => true,
    ]);

    // Create specimen with type1
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-07-2026',
        'customer' => $customer->id,
        'location_id' => $location->id,
        'specimen_type' => $type1->id,
        'specimen_type_examination' => $examination1->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'anatomic_site' => 'Estómago',
        'diagnosis' => 'Gastritis',
        'active' => true,
    ]);

    // Act: Send update request with type2
    $response = $this->actingAs($user)
        ->put(route('specimens.update', $specimen->id), [
            'customer' => $customer->id,
            'specimen_type' => $type2->id,
            'specimen_type_examination' => $examination2->id,
            'specimen_category' => $category->id,
            'referrer' => $referrer->id,
            'anatomic_site' => 'Estómago',
            'diagnosis' => 'Gastritis',
            'clinical_notes' => 'Notas',
            'status' => 'received',
            'priority_id' => $priority->id,
        ]);

    // Assert redirect
    $response->assertRedirect();

    // Verify specimen updated in database
    $specimen->refresh();
    expect($specimen->specimen_type)->toBe($type2->id);
    expect($specimen->sequence_code)->toBe('CYT-0005-07-2026');

    // Verify Sequence 2's current_sequence was incremented
    $sequence2->refresh();
    expect($sequence2->current_sequence)->toBe(6);
});

test('specimen payment type change from credit to cash is successful when credit has no payments', function () {
    $editRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    Gate::define('specimens.edit', fn () => true);

    $user = User::factory()->create([
        'role_id' => $editRole->id,
        'active' => true,
    ]);

    $customer = Customer::factory()->create();
    $location = Location::create(['name' => 'Principal', 'address' => 'Dirección', 'active' => true]);
    $type = SpecimenType::create(['name' => 'Biopsia', 'active' => true]);
    $examination = SpecimenTypeExamination::create([
        'specimen_type' => $type->id,
        'name' => 'Examen 1',
        'code' => 'EX1',
        'description' => 'Desc 1',
        'active' => true,
    ]);
    $category = SpecimenCategory::create(['name' => 'Categoría', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Tipo de Referente', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Referente', 'referrer_type' => $referrerType->id, 'active' => true]);
    $priority = Priority::create(['name' => 'Baja', 'color' => '#10b981', 'order' => 3, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-07-2026',
        'customer' => $customer->id,
        'location_id' => $location->id,
        'specimen_type' => $type->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'anatomic_site' => 'Estómago',
        'diagnosis' => 'Gastritis',
        'active' => true,
    ]);

    $credit = Credit::create([
        'customer_id' => $customer->id,
        'credit_amount' => 500.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 500.00,
        'specimen_id' => $specimen->id,
    ]);

    $caiRange = CaiRange::create([
        'location_id' => $location->id,
        'cai' => 'A1B2C3D4',
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

    $invoice = Invoice::create([
        'full_invoice_number' => 'INV-001',
        'invoice_number' => '001',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer->id,
        'specimen_id' => $specimen->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $credit->id,
        'quantity' => 1,
        'amount' => 500.00,
        'discount' => 0.00,
        'subtotal' => 500.00,
        'total' => 500.00,
        'total_paid' => 0.00,
        'invoice_file' => '',
    ]);

    $response = $this->actingAs($user)
        ->put(route('specimens.update', $specimen->id), [
            'customer' => $customer->id,
            'specimen_type' => $type->id,
            'specimen_type_examination' => $examination->id,
            'specimen_category' => $category->id,
            'referrer' => $referrer->id,
            'anatomic_site' => 'Estómago',
            'diagnosis' => 'Gastritis',
            'status' => 'received',
            'priority_id' => $priority->id,
            'payment_type' => 'cash',
            'regenerate_pdf' => false,
        ]);

    $response->assertRedirect();
    $invoice->refresh();

    expect($invoice->payment_type)->toBe('cash');
    expect($invoice->credit_payment_id)->toBeNull();
    expect((float) $invoice->total_paid)->toEqual(500.00);
    expect(Credit::find($credit->id))->toBeNull();
});

test('specimen payment type change from credit to cash fails when credit has payments', function () {
    $editRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    Gate::define('specimens.edit', fn () => true);

    $user = User::factory()->create([
        'role_id' => $editRole->id,
        'active' => true,
    ]);

    $customer = Customer::factory()->create();
    $location = Location::create(['name' => 'Principal', 'address' => 'Dirección', 'active' => true]);
    $type = SpecimenType::create(['name' => 'Biopsia', 'active' => true]);
    $examination = SpecimenTypeExamination::create([
        'specimen_type' => $type->id,
        'name' => 'Examen 1',
        'code' => 'EX1',
        'description' => 'Desc 1',
        'active' => true,
    ]);
    $category = SpecimenCategory::create(['name' => 'Categoría', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Tipo de Referente', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Referente', 'referrer_type' => $referrerType->id, 'active' => true]);
    $priority = Priority::create(['name' => 'Baja', 'color' => '#10b981', 'order' => 3, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-07-2026',
        'customer' => $customer->id,
        'location_id' => $location->id,
        'specimen_type' => $type->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'anatomic_site' => 'Estómago',
        'diagnosis' => 'Gastritis',
        'active' => true,
    ]);

    $credit = Credit::create([
        'customer_id' => $customer->id,
        'credit_amount' => 500.00,
        'amount_paid' => 100.00,
        'amount_remaining' => 400.00,
        'specimen_id' => $specimen->id,
    ]);

    $caiRange = CaiRange::create([
        'location_id' => $location->id,
        'cai' => 'A1B2C3D4',
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

    $invoice = Invoice::create([
        'full_invoice_number' => 'INV-001',
        'invoice_number' => '001',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer->id,
        'specimen_id' => $specimen->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $credit->id,
        'quantity' => 1,
        'amount' => 500.00,
        'discount' => 0.00,
        'subtotal' => 500.00,
        'total' => 500.00,
        'total_paid' => 100.00,
        'invoice_file' => '',
    ]);

    Invoice::create([
        'full_invoice_number' => 'INV-002',
        'invoice_number' => '002',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer->id,
        'payment_type' => 'cash',
        'invoice_type' => 'credit payment',
        'credit_payment_id' => $credit->id,
        'amount' => 100.00,
        'discount' => 0.00,
        'subtotal' => 100.00,
        'total' => 100.00,
        'total_paid' => 100.00,
        'invoice_file' => '',
    ]);

    $response = $this->actingAs($user)
        ->from(route('specimens.index'))
        ->put(route('specimens.update', $specimen->id), [
            'customer' => $customer->id,
            'specimen_type' => $type->id,
            'specimen_type_examination' => $examination->id,
            'specimen_category' => $category->id,
            'referrer' => $referrer->id,
            'anatomic_site' => 'Estómago',
            'diagnosis' => 'Gastritis',
            'status' => 'received',
            'priority_id' => $priority->id,
            'payment_type' => 'cash',
            'regenerate_pdf' => false,
        ]);

    $response->assertSessionHasErrors(['payment_type']);
});

test('specimen payment type change from cash to credit creates a credit record', function () {
    $editRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    Gate::define('specimens.edit', fn () => true);

    $user = User::factory()->create([
        'role_id' => $editRole->id,
        'active' => true,
    ]);

    $customer = Customer::factory()->create();
    $location = Location::create(['name' => 'Principal', 'address' => 'Dirección', 'active' => true]);
    $type = SpecimenType::create(['name' => 'Biopsia', 'active' => true]);
    $examination = SpecimenTypeExamination::create([
        'specimen_type' => $type->id,
        'name' => 'Examen 1',
        'code' => 'EX1',
        'description' => 'Desc 1',
        'active' => true,
    ]);
    $category = SpecimenCategory::create(['name' => 'Categoría', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Tipo de Referente', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Referente', 'referrer_type' => $referrerType->id, 'active' => true]);
    $priority = Priority::create(['name' => 'Baja', 'color' => '#10b981', 'order' => 3, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-07-2026',
        'customer' => $customer->id,
        'location_id' => $location->id,
        'specimen_type' => $type->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'anatomic_site' => 'Estómago',
        'diagnosis' => 'Gastritis',
        'active' => true,
    ]);

    $caiRange = CaiRange::create([
        'location_id' => $location->id,
        'cai' => 'A1B2C3D4',
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

    $invoice = Invoice::create([
        'full_invoice_number' => 'INV-001',
        'invoice_number' => '001',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer->id,
        'specimen_id' => $specimen->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 500.00,
        'discount' => 0.00,
        'subtotal' => 500.00,
        'total' => 500.00,
        'total_paid' => 500.00,
        'invoice_file' => '',
    ]);

    $response = $this->actingAs($user)
        ->put(route('specimens.update', $specimen->id), [
            'customer' => $customer->id,
            'specimen_type' => $type->id,
            'specimen_type_examination' => $examination->id,
            'specimen_category' => $category->id,
            'referrer' => $referrer->id,
            'anatomic_site' => 'Estómago',
            'diagnosis' => 'Gastritis',
            'status' => 'received',
            'priority_id' => $priority->id,
            'payment_type' => 'credit',
            'regenerate_pdf' => false,
        ]);

    $response->assertRedirect();
    $invoice->refresh();

    expect($invoice->payment_type)->toBe('credit');
    expect($invoice->credit_payment_id)->not->toBeNull();
    expect((float) $invoice->total_paid)->toEqual(0.00);

    $credit = Credit::find($invoice->credit_payment_id);
    expect($credit)->not->toBeNull();
    expect((float) $credit->credit_amount)->toEqual(500.00);
    expect((float) $credit->amount_paid)->toEqual(0.00);
    expect((float) $credit->amount_remaining)->toEqual(500.00);
});

test('specimen payment type change from credit to credit card requires proof of payment', function () {
    $editRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    Gate::define('specimens.edit', fn () => true);

    $user = User::factory()->create([
        'role_id' => $editRole->id,
        'active' => true,
    ]);

    $customer = Customer::factory()->create();
    $location = Location::create(['name' => 'Principal', 'address' => 'Dirección', 'active' => true]);
    $type = SpecimenType::create(['name' => 'Biopsia', 'active' => true]);
    $examination = SpecimenTypeExamination::create([
        'specimen_type' => $type->id,
        'name' => 'Examen 1',
        'code' => 'EX1',
        'description' => 'Desc 1',
        'active' => true,
    ]);
    $category = SpecimenCategory::create(['name' => 'Categoría', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Tipo de Referente', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Referente', 'referrer_type' => $referrerType->id, 'active' => true]);
    $priority = Priority::create(['name' => 'Baja', 'color' => '#10b981', 'order' => 3, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-07-2026',
        'customer' => $customer->id,
        'location_id' => $location->id,
        'specimen_type' => $type->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'anatomic_site' => 'Estómago',
        'diagnosis' => 'Gastritis',
        'active' => true,
    ]);

    $credit = Credit::create([
        'customer_id' => $customer->id,
        'credit_amount' => 500.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 500.00,
        'specimen_id' => $specimen->id,
    ]);

    $caiRange = CaiRange::create([
        'location_id' => $location->id,
        'cai' => 'A1B2C3D4',
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

    $invoice = Invoice::create([
        'full_invoice_number' => 'INV-001',
        'invoice_number' => '001',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer->id,
        'specimen_id' => $specimen->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $credit->id,
        'quantity' => 1,
        'amount' => 500.00,
        'discount' => 0.00,
        'subtotal' => 500.00,
        'total' => 500.00,
        'total_paid' => 0.00,
        'invoice_file' => '',
    ]);

    $response = $this->actingAs($user)
        ->from(route('specimens.index'))
        ->put(route('specimens.update', $specimen->id), [
            'customer' => $customer->id,
            'specimen_type' => $type->id,
            'specimen_type_examination' => $examination->id,
            'specimen_category' => $category->id,
            'referrer' => $referrer->id,
            'anatomic_site' => 'Estómago',
            'diagnosis' => 'Gastritis',
            'status' => 'received',
            'priority_id' => $priority->id,
            'payment_type' => 'credit card',
            'regenerate_pdf' => false,
        ]);

    $response->dump();
    $response->assertSessionHasErrors(['proof_of_payment']);
});

test('specimen payment type change from credit to credit card succeeds when proof of payment is uploaded', function () {
    Storage::fake('public');

    $editRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    Gate::define('specimens.edit', fn () => true);

    $user = User::factory()->create([
        'role_id' => $editRole->id,
        'active' => true,
    ]);

    $customer = Customer::factory()->create();
    $location = Location::create(['name' => 'Principal', 'address' => 'Dirección', 'active' => true]);
    $type = SpecimenType::create(['name' => 'Biopsia', 'active' => true]);
    $examination = SpecimenTypeExamination::create([
        'specimen_type' => $type->id,
        'name' => 'Examen 1',
        'code' => 'EX1',
        'description' => 'Desc 1',
        'active' => true,
    ]);
    $category = SpecimenCategory::create(['name' => 'Categoría', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Tipo de Referente', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Referente', 'referrer_type' => $referrerType->id, 'active' => true]);
    $priority = Priority::create(['name' => 'Baja', 'color' => '#10b981', 'order' => 3, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-07-2026',
        'customer' => $customer->id,
        'location_id' => $location->id,
        'specimen_type' => $type->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'anatomic_site' => 'Estómago',
        'diagnosis' => 'Gastritis',
        'active' => true,
    ]);

    $credit = Credit::create([
        'customer_id' => $customer->id,
        'credit_amount' => 500.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 500.00,
        'specimen_id' => $specimen->id,
    ]);

    $caiRange = CaiRange::create([
        'location_id' => $location->id,
        'cai' => 'A1B2C3D4',
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

    $invoice = Invoice::create([
        'full_invoice_number' => 'INV-001',
        'invoice_number' => '001',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer->id,
        'specimen_id' => $specimen->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $credit->id,
        'quantity' => 1,
        'amount' => 500.00,
        'discount' => 0.00,
        'subtotal' => 500.00,
        'total' => 500.00,
        'total_paid' => 0.00,
        'invoice_file' => '',
    ]);

    $file = UploadedFile::fake()->create('proof.pdf', 100);

    $response = $this->actingAs($user)
        ->put(route('specimens.update', $specimen->id), [
            'customer' => $customer->id,
            'specimen_type' => $type->id,
            'specimen_type_examination' => $examination->id,
            'specimen_category' => $category->id,
            'referrer' => $referrer->id,
            'anatomic_site' => 'Estómago',
            'diagnosis' => 'Gastritis',
            'status' => 'received',
            'priority_id' => $priority->id,
            'payment_type' => 'credit card',
            'proof_of_payment' => $file,
            'regenerate_pdf' => false,
        ]);

    $response->assertRedirect();
    $invoice->refresh();

    expect($invoice->payment_type)->toBe('credit card');
    expect($invoice->proof_of_payment)->not->toBeNull();
    expect($invoice->proof_of_payment)->not->toBe('Efectivo');
    expect(Storage::disk('public')->exists($invoice->proof_of_payment))->toBeTrue();
});

test('specimen report updates template and resets Yjs state when specimen type is changed', function () {
    $editRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    Gate::define('specimens.edit', fn () => true);

    $user = User::factory()->create([
        'role_id' => $editRole->id,
        'active' => true,
    ]);

    $customer = Customer::factory()->create();

    $location = Location::create([
        'name' => 'Principal',
        'address' => 'Dirección',
        'active' => true,
    ]);

    $type1 = SpecimenType::create([
        'name' => 'Biopsia',
        'active' => true,
    ]);

    $type2 = SpecimenType::create([
        'name' => 'Citología',
        'active' => true,
    ]);

    $sequence1 = Sequence::create([
        'location_id' => $location->id,
        'specimen_type' => $type1->id,
        'prefix' => 'BIO',
        'separator' => '-',
        'fill' => 4,
        'month' => 7,
        'year' => 2026,
        'current_sequence' => 1,
        'active' => true,
    ]);

    $sequence2 = Sequence::create([
        'location_id' => $location->id,
        'specimen_type' => $type2->id,
        'prefix' => 'CYT',
        'separator' => '-',
        'fill' => 4,
        'month' => 7,
        'year' => 2026,
        'current_sequence' => 5,
        'active' => true,
    ]);

    $examination1 = SpecimenTypeExamination::create([
        'specimen_type' => $type1->id,
        'name' => 'Examen 1',
        'code' => 'EX1',
        'description' => 'Desc 1',
        'active' => true,
    ]);

    $examination2 = SpecimenTypeExamination::create([
        'specimen_type' => $type2->id,
        'name' => 'Examen 2',
        'code' => 'EX2',
        'description' => 'Desc 2',
        'active' => true,
    ]);

    $category = SpecimenCategory::create([
        'name' => 'Categoría',
        'quantity' => 1,
        'active' => true,
    ]);

    $referrerType = ReferrerType::create([
        'name' => 'Tipo de Referente',
        'active' => true,
    ]);

    $referrer = Referrer::create([
        'name' => 'Referente',
        'referrer_type' => $referrerType->id,
        'active' => true,
    ]);

    $priority = Priority::create([
        'name' => 'Baja',
        'color' => '#10b981',
        'order' => 3,
        'active' => true,
    ]);

    // Create a template for type2/examination2
    $template2 = SpecimenTypeTemplate::create([
        'specimen_type_id' => $type2->id,
        'specimen_type_examination_id' => $examination2->id,
        'macroscopy_html' => '<p>Nueva Macroscopía</p>',
        'microscopy_html' => '<p>Nueva Microscopía</p>',
        'diagnosis_html' => '<p>Nuevo Diagnóstico</p>',
        'clinical_details_html' => '<p>Nuevos Detalles Clínicos</p>',
        'comments_notes_html' => '<p>Nuevos Comentarios</p>',
        'protocols_html' => '<p>Nuevos Protocolos</p>',
        'legend_html' => '<p>Nueva Leyenda</p>',
        'user_id' => $user->id,
    ]);

    // Create a report first
    $report = SpecimenReport::create([
        'report_date' => now()->format('Y-m-d'),
        'macroscopy_html' => '<p>Original Macro</p>',
        'microscopy_html' => '<p>Original Micro</p>',
        'diagnosis_html' => '<p>Original Diagnosis</p>',
    ]);

    // Set binary state vectors on database to make sure they get reset
    DB::table('specimen_reports')->where('id', $report->id)->update([
        'yjs_macroscopy_state' => 'some_data',
        'yjs_microscopy_state' => 'some_data',
    ]);

    // Create specimen with type1 and report_id
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-07-2026',
        'customer' => $customer->id,
        'location_id' => $location->id,
        'specimen_type' => $type1->id,
        'specimen_type_examination' => $examination1->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'anatomic_site' => 'Estómago',
        'diagnosis' => 'Gastritis',
        'active' => true,
        'report_id' => $report->id,
    ]);

    // Act: Send update request with type2 and examination2
    $response = $this->actingAs($user)
        ->put(route('specimens.update', $specimen->id), [
            'customer' => $customer->id,
            'specimen_type' => $type2->id,
            'specimen_type_examination' => $examination2->id,
            'specimen_category' => $category->id,
            'referrer' => $referrer->id,
            'anatomic_site' => 'Estómago',
            'diagnosis' => 'Gastritis',
            'clinical_notes' => 'Notas',
            'status' => 'received',
            'priority_id' => $priority->id,
            'regenerate_pdf' => false,
            'template_id' => $template2->id,
        ]);

    $response->assertRedirect();

    $report->refresh();

    // Assert that the HTML content is overwritten with the template values
    expect($report->macroscopy_html)->toBe('<p>Nueva Macroscopía</p>');
    expect($report->microscopy_html)->toBe('<p>Nueva Microscopía</p>');
    expect($report->diagnosis_html)->toBe('<p>Nuevo Diagnóstico</p>');
    expect($report->clinical_details_html)->toBe('<p>Nuevos Detalles Clínicos</p>');

    // Assert that YJS state vectors were wiped
    $dbReport = DB::table('specimen_reports')->where('id', $report->id)->first();
    expect($dbReport->yjs_macroscopy_state)->toBeNull();
    expect($dbReport->yjs_microscopy_state)->toBeNull();
});

test('specimen bulk status cancellation updates invoice values to zero, deletes credit, and triggers pdf regeneration', function () {
    $editRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    Gate::define('specimens.edit', fn () => true);

    $user = User::factory()->create([
        'role_id' => $editRole->id,
        'active' => true,
    ]);

    $customer = Customer::factory()->create();
    $location = Location::create(['name' => 'Principal', 'address' => 'Dirección', 'active' => true]);
    $type = SpecimenType::create(['name' => 'Biopsia', 'active' => true]);
    $examination = SpecimenTypeExamination::create([
        'specimen_type' => $type->id,
        'name' => 'Examen 1',
        'code' => 'EX1',
        'description' => 'Desc 1',
        'active' => true,
    ]);
    $category = SpecimenCategory::create(['name' => 'Categoría', 'quantity' => 1, 'active' => true]);
    $referrerType = ReferrerType::create(['name' => 'Tipo de Referente', 'active' => true]);
    $referrer = Referrer::create(['name' => 'Referente', 'referrer_type' => $referrerType->id, 'active' => true]);
    $priority = Priority::create(['name' => 'Baja', 'color' => '#10b981', 'order' => 3, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-07-2026',
        'customer' => $customer->id,
        'location_id' => $location->id,
        'specimen_type' => $type->id,
        'specimen_type_examination' => $examination->id,
        'specimen_category' => $category->id,
        'referrer' => $referrer->id,
        'priority_id' => $priority->id,
        'anatomic_site' => 'Estómago',
        'diagnosis' => 'Gastritis',
        'active' => true,
    ]);

    $credit = Credit::create([
        'customer_id' => $customer->id,
        'credit_amount' => 500.00,
        'amount_paid' => 0.00,
        'amount_remaining' => 500.00,
        'specimen_id' => $specimen->id,
    ]);

    $caiRange = CaiRange::create([
        'location_id' => $location->id,
        'cai' => 'A1B2C3D4',
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

    $invoice = Invoice::create([
        'full_invoice_number' => 'INV-001',
        'invoice_number' => '001',
        'cai_range_id' => $caiRange->id,
        'customer_id' => $customer->id,
        'specimen_id' => $specimen->id,
        'payment_type' => 'credit',
        'credit_payment_id' => $credit->id,
        'quantity' => 1,
        'amount' => 500.00,
        'discount' => 0.00,
        'subtotal' => 500.00,
        'total' => 500.00,
        'total_paid' => 0.00,
        'invoice_file' => 'invoices/some_test.pdf',
    ]);

    // Mock PDF service to avoid running Puppeteer
    $pdfServiceMock = Mockery::mock(\App\Services\InvoicePdfService::class);
    $pdfServiceMock->shouldReceive('generateAndStoreInvoice')
        ->once()
        ->with(Mockery::on(function ($arg) use ($invoice) {
            return $arg->id === $invoice->id 
                && (float)$arg->total === 500.00 
                && $arg->invoice_type === 'cancelled';
        }))
        ->andReturn('invoices/regenerated_test.pdf');
    app()->instance(\App\Services\InvoicePdfService::class, $pdfServiceMock);

    // Call bulkAction status update to 'cancelled'
    $response = $this->actingAs($user)
        ->post(route('specimens.bulk-action'), [
            'ids' => [$specimen->id],
            'action' => 'change_status',
            'value' => 'cancelled',
            'cancellation_reason' => 'Test cancellation reason',
        ]);

    $response->assertRedirect();
    $specimen->refresh();
    $invoice->refresh();

    expect($specimen->status)->toBe('cancelled');
    expect($specimen->cancellation_reason)->toBe('Test cancellation reason');

    expect($invoice->invoice_type)->toBe('cancelled');
    expect((float) $invoice->total)->toEqual(0.00);
    expect((float) $invoice->amount)->toEqual(0.00);
    expect((float) $invoice->subtotal)->toEqual(0.00);
    expect($invoice->credit_payment_id)->toBeNull();

    expect(Credit::find($credit->id))->toBeNull();
});
