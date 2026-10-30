<?php

use App\Models\CaiRange;
use App\Models\Customer;
use App\Models\Department;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\Municipality;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Role;
use App\Models\Sequence;
use App\Models\Setting;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenReport;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->department = Department::create(['name' => 'Cortés', 'code' => '05']);
    $this->municipality = Municipality::create(['department_id' => $this->department->id, 'name' => 'San Pedro Sula', 'code' => '0501']);
    $this->location = Location::create(['name' => 'Principal', 'address' => 'Dirección', 'active' => true]);

    $this->specimenType = SpecimenType::create(['name' => 'Biopsia']);
    $this->examination = SpecimenTypeExamination::create(['specimen_type' => $this->specimenType->id, 'name' => 'Examen General', 'code' => 'EG']);
    $this->category = SpecimenCategory::create(['name' => 'Categoría A', 'quantity' => 1]);
    $this->referrerType = ReferrerType::create(['name' => 'Clínica']);
    $this->referrer = Referrer::create(['name' => 'Dr. Smith', 'referrer_type' => $this->referrerType->id, 'active' => true]);
    $this->priority = Priority::create(['name' => 'Media', 'color' => '#f59e0b', 'order' => 1, 'active' => true]);

    $this->caiRange = CaiRange::create([
        'cai' => 'ABC-123',
        'location_id' => $this->location->id,
        'emission' => '000',
        'establishment' => '001',
        'document_type' => '01',
        'prefix' => '001',
        'point_of_sale' => '001',
        'type' => '01',
        'full_prefix' => '001-001-01-',
        'start_number' => 1,
        'end_number' => 1000,
        'last_used_number' => 0,
        'expiration_date' => now()->addYear(),
        'deadline' => now()->addYear()->format('Y-m-d'),
        'status' => 'active',
    ]);

    $this->sequence = Sequence::create([
        'prefix' => 'BIO',
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'separator' => '-',
        'fill' => 4,
        'current_sequence' => 1,
        'active' => true,
    ]);

    Setting::create(['setting_key' => 'default_location_id', 'setting_value' => (string) $this->location->id, 'description' => 'Default Location']);

    $this->adminRole = Role::create(['slug' => 'admin', 'name' => 'Admin']);
    $this->user = User::factory()->create([
        'role_id' => $this->adminRole->id,
        'active' => true,
    ]);

    $this->customerA = Customer::create([
        'name' => 'Paciente Juan',
        'id_number' => '0801-1990-00001',
        'type' => 'cliente',
        'phone' => '9999-1111',
        'email' => 'juan@example.com',
        'password' => Hash::make('password123'),
        'portal_access' => true,
        'active' => true,
    ]);

    $this->customerB = Customer::create([
        'name' => 'Padrino Pedro',
        'id_number' => '0801-1990-00002',
        'type' => 'cliente',
        'phone' => '9999-2222',
        'email' => 'pedro@example.com',
        'password' => Hash::make('password123'),
        'portal_access' => true,
        'active' => true,
    ]);

    $this->customerC = Customer::create([
        'name' => 'Ajeno Carlos',
        'id_number' => '0801-1990-00003',
        'type' => 'cliente',
        'phone' => '9999-3333',
        'email' => 'carlos@example.com',
        'password' => Hash::make('password123'),
        'portal_access' => true,
        'active' => true,
    ]);
});

test('store specimen without switch sets individual_customer_id to patient customer by default', function () {
    $response = $this->actingAs($this->user)
        ->post(route('specimens.store'), [
            'customer' => $this->customerA->id,
            'specimen_type' => $this->specimenType->id,
            'specimen_type_examination' => $this->examination->id,
            'specimen_category' => $this->category->id,
            'referrer' => $this->referrer->id,
            'priority_id' => $this->priority->id,
            'status' => 'received',
            'quantity' => 1,
            'amount' => 1000,
            'discount' => 0,
            'payment_type' => 'cash',
        ]);

    $response->assertRedirect();

    $specimen = Specimen::where('customer', $this->customerA->id)->firstOrFail();
    $invoice = Invoice::where('specimen_id', $specimen->id)->firstOrFail();

    expect($invoice->customer_id)->toBe($this->customerA->id)
        ->and($invoice->individual_customer_id)->toBe($this->customerA->id);
});

test('store specimen with switch enabled sets individual_customer_id to selected customer', function () {
    $response = $this->actingAs($this->user)
        ->post(route('specimens.store'), [
            'customer' => $this->customerA->id,
            'has_individual_customer' => true,
            'individual_customer_id' => $this->customerB->id,
            'specimen_type' => $this->specimenType->id,
            'specimen_type_examination' => $this->examination->id,
            'specimen_category' => $this->category->id,
            'referrer' => $this->referrer->id,
            'priority_id' => $this->priority->id,
            'status' => 'received',
            'quantity' => 1,
            'amount' => 1000,
            'discount' => 0,
            'payment_type' => 'cash',
        ]);

    $response->assertRedirect();

    $specimen = Specimen::where('customer', $this->customerA->id)->firstOrFail();
    $invoice = Invoice::where('specimen_id', $specimen->id)->firstOrFail();

    expect($invoice->customer_id)->toBe($this->customerA->id)
        ->and($invoice->individual_customer_id)->toBe($this->customerB->id);
});

test('both patient customer and individual invoice customer can view specimen in customer portal', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0001-2026',
        'customer' => $this->customerA->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'access_token' => 'token-test-1',
    ]);

    Invoice::create([
        'specimen_id' => $specimen->id,
        'customer_id' => $this->customerA->id,
        'individual_customer_id' => $this->customerB->id,
        'payment_type' => 'cash',
        'amount' => 1000,
        'subtotal' => 1000,
        'total' => 1000,
        'total_paid' => 1000,
        'invoice_file' => 'invoices/test.pdf',
    ]);

    // Customer A (Patient) can see specimen in portal dashboard
    $resA = $this->actingAs($this->customerA, 'customer')->get(route('customer-portal.dashboard'));
    $resA->assertOk();
    $resA->assertInertia(fn ($page) => $page
        ->component('customers/customer-portal/index')
        ->has('specimens.data', 1)
        ->where('specimens.data.0.sequence_code', 'BIO-0001-2026')
    );

    // Customer B (Individual invoice customer) can ALSO see specimen in portal dashboard
    $resB = $this->actingAs($this->customerB, 'customer')->get(route('customer-portal.dashboard'));
    $resB->assertOk();
    $resB->assertInertia(fn ($page) => $page
        ->component('customers/customer-portal/index')
        ->has('specimens.data', 1)
        ->where('specimens.data.0.sequence_code', 'BIO-0001-2026')
    );

    // Customer B can view specimen details
    $resBShow = $this->actingAs($this->customerB, 'customer')
        ->get(route('customer-portal.specimens.show', $specimen->sequence_code));
    $resBShow->assertOk();
    $resBShow->assertInertia(fn ($page) => $page
        ->component('customers/customer-portal/show')
        ->where('specimen.sequence_code', 'BIO-0001-2026')
    );

    // Customer C (Unrelated) gets 404
    $resC = $this->actingAs($this->customerC, 'customer')
        ->get(route('customer-portal.specimens.show', $specimen->sequence_code));
    $resC->assertNotFound();
});

test('individual invoice customer can download finalized report in portal', function () {
    Storage::fake('public');

    $reportFile = 'reports/test_report.pdf';
    Storage::disk('public')->put($reportFile, '%PDF-1.4 test dummy');

    $report = SpecimenReport::create([
        'report_code' => 'REP-0001',
        'report_date' => now(),
        'report_file' => $reportFile,
    ]);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0002-2026',
        'customer' => $this->customerA->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'finalized',
        'report_id' => $report->id,
        'access_token' => 'token-test-2',
    ]);

    Invoice::create([
        'specimen_id' => $specimen->id,
        'customer_id' => $this->customerA->id,
        'individual_customer_id' => $this->customerB->id,
        'payment_type' => 'cash',
        'amount' => 1000,
        'subtotal' => 1000,
        'total' => 1000,
        'total_paid' => 1000,
        'invoice_file' => 'invoices/test.pdf',
    ]);

    $response = $this->actingAs($this->customerB, 'customer')
        ->get(route('customer-portal.specimens.report', $specimen->sequence_code));

    $response->assertOk();
});

test('updating specimen can change individual_customer_id on invoice', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0003-2026',
        'customer' => $this->customerA->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ]);

    $invoice = Invoice::create([
        'specimen_id' => $specimen->id,
        'customer_id' => $this->customerA->id,
        'individual_customer_id' => $this->customerA->id,
        'payment_type' => 'cash',
        'amount' => 1000,
        'subtotal' => 1000,
        'total' => 1000,
        'total_paid' => 1000,
        'invoice_file' => 'invoices/test.pdf',
    ]);

    $this->actingAs($this->user)->put(route('specimens.update', $specimen), [
        'customer' => $this->customerA->id,
        'has_individual_customer' => true,
        'individual_customer_id' => $this->customerB->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ])->assertRedirect();

    expect($invoice->fresh()->individual_customer_id)->toBe($this->customerB->id);

    // When toggling switch OFF, reverts to specimen customer
    $this->actingAs($this->user)->put(route('specimens.update', $specimen), [
        'customer' => $this->customerA->id,
        'has_individual_customer' => false,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ])->assertRedirect();

    expect($invoice->fresh()->individual_customer_id)->toBe($this->customerA->id);
});

test('updating invoice directly updates individual_customer_id', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-0004-2026',
        'customer' => $this->customerA->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ]);

    $invoice = Invoice::create([
        'specimen_id' => $specimen->id,
        'customer_id' => $this->customerA->id,
        'individual_customer_id' => $this->customerA->id,
        'payment_type' => 'cash',
        'amount' => 1000,
        'discount' => 0,
        'quantity' => 1,
        'subtotal' => 1000,
        'exempt_amount' => 1000,
        'total' => 1000,
        'total_paid' => 1000,
        'invoice_file' => 'invoices/test.pdf',
    ]);

    $this->actingAs($this->user)->put(route('invoices.update', $invoice), [
        'customer_id' => $this->customerA->id,
        'has_individual_customer' => true,
        'individual_customer_id' => $this->customerB->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 1000,
        'discount' => 0,
        'subtotal' => 1000,
        'exempt_amount' => 1000,
        'total' => 1000,
        'total_paid' => 1000,
    ])->assertRedirect();

    expect($invoice->fresh()->individual_customer_id)->toBe($this->customerB->id);
});
