<?php

use App\Models\Customer;
use App\Models\Department;
use App\Models\Municipality;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\ReferrerType;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenGroup;
use App\Models\SpecimenReport;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->department = Department::create(['name' => 'Cortés', 'code' => '05']);
    $this->municipality = Municipality::create(['department_id' => $this->department->id, 'name' => 'San Pedro Sula', 'code' => '0501']);

    $this->specimenType = SpecimenType::create(['name' => 'Biopsia']);
    $this->examination = SpecimenTypeExamination::create(['specimen_type' => $this->specimenType->id, 'name' => 'Examen General', 'code' => 'EG']);
    $this->category = SpecimenCategory::create(['name' => 'Categoría A', 'quantity' => 1]);
    $this->referrerType = ReferrerType::create(['name' => 'Clínica']);
    $this->referrer = Referrer::create(['name' => 'Dr. Smith', 'referrer_type' => $this->referrerType->id, 'active' => true]);
    $this->priority = Priority::create(['name' => 'Media', 'color' => '#f59e0b', 'order' => 1, 'active' => true]);

    $this->customerA = Customer::create([
        'name' => 'Cliente A',
        'id_number' => '0801-1990-00001',
        'type' => 'cliente',
        'phone' => '9999-1111',
        'email' => 'clientea@example.com',
        'password' => Hash::make('password123'),
        'portal_access' => true,
        'active' => true,
    ]);

    $this->customerB = Customer::create([
        'name' => 'Cliente B',
        'id_number' => '0801-1990-00002',
        'type' => 'cliente',
        'phone' => '9999-2222',
        'email' => 'clienteb@example.com',
        'password' => Hash::make('password123'),
        'portal_access' => true,
        'active' => true,
    ]);

    $this->specimenA = Specimen::create([
        'sequence_code' => 'BIO-0001-2026',
        'customer' => $this->customerA->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'access_token' => 'token-a',
    ]);

    $this->specimenB = Specimen::create([
        'sequence_code' => 'BIO-0002-2026',
        'customer' => $this->customerB->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'finalized',
        'access_token' => 'token-b',
    ]);
});

test('customer only sees their own specimens in the portal list', function () {
    $response = $this->actingAs($this->customerA, 'customer')
        ->get(route('customer-portal.dashboard'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('customers/customer-portal/index')
        ->has('specimens.data', 1)
        ->where('specimens.data.0.sequence_code', 'BIO-0001-2026')
    );
});

test('customer cannot access details of another customer specimen (anti-idor returns 404)', function () {
    $response = $this->actingAs($this->customerA, 'customer')
        ->get(route('customer-portal.specimens.show', $this->specimenB->sequence_code));

    $response->assertNotFound();
});

test('customer can access details of their own specimen', function () {
    $response = $this->actingAs($this->customerA, 'customer')
        ->get(route('customer-portal.specimens.show', $this->specimenA->sequence_code));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('customers/customer-portal/show')
        ->where('specimen.sequence_code', 'BIO-0001-2026')
    );
});

test('customer cannot download report if status is not finalized or delivered', function () {
    $report = SpecimenReport::create([
        'report_code' => 'REP-0001',
        'report_date' => now(),
    ]);
    $this->specimenA->update(['report_id' => $report->id, 'status' => 'processing']);

    $response = $this->actingAs($this->customerA, 'customer')
        ->get(route('customer-portal.specimens.report', $this->specimenA->sequence_code));

    $response->assertForbidden();
});

test('customer can download report when status is finalized', function () {
    Storage::fake('public');

    $reportFile = 'reports/test_report.pdf';
    Storage::disk('public')->put($reportFile, '%PDF-1.4 test dummy');

    $report = SpecimenReport::create([
        'report_code' => 'REP-0002',
        'report_date' => now(),
        'report_file' => $reportFile,
    ]);

    $this->specimenA->update([
        'report_id' => $report->id,
        'status' => 'finalized',
    ]);

    $response = $this->actingAs($this->customerA, 'customer')
        ->get(route('customer-portal.specimens.report', $this->specimenA->sequence_code));

    $response->assertOk();
});

test('company customer can view specimens belonging to their specimen groups', function () {
    $companyCustomer = Customer::create([
        'name' => 'Hospital San Pedro',
        'id_number' => '0501-9000-00001',
        'type' => 'empresa',
        'phone' => '2550-0000',
        'email' => 'hospital@example.com',
        'password' => Hash::make('password123'),
        'portal_access' => true,
        'active' => true,
    ]);

    $group = SpecimenGroup::create([
        'name' => 'Lote Hospital 01',
        'customer_id' => $companyCustomer->id,
        'invoice_id' => 1,
    ]);

    $groupSpecimen = Specimen::create([
        'sequence_code' => 'BIO-0003-2026',
        'customer' => $this->customerA->id, // Patient is customer A
        'group_id' => $group->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ]);

    // Hospital San Pedro logs in and can see the group specimen
    $response = $this->actingAs($companyCustomer, 'customer')
        ->get(route('customer-portal.dashboard'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('customers/customer-portal/index')
        ->has('specimens.data', 1)
        ->where('specimens.data.0.sequence_code', 'BIO-0003-2026')
    );
});

test('customer portal show displays dynamic timeline steps and status metadata based on specimen type states', function () {
    // Create custom specimen type with specific active states (skip macroscopic and microscopic reviews)
    $customType = SpecimenType::create(['name' => 'Citología Líquida']);

    $customType->states()->create(['status' => 'received', 'step_order' => 1, 'active' => true]);
    $customType->states()->create(['status' => 'macroscopic_review', 'step_order' => 2, 'active' => false]);
    $customType->states()->create(['status' => 'processing', 'step_order' => 3, 'active' => true]);
    $customType->states()->create(['status' => 'microscopic_review', 'step_order' => 4, 'active' => false]);
    $customType->states()->create(['status' => 'finalized', 'step_order' => 5, 'active' => true]);
    $customType->states()->create(['status' => 'delivered', 'step_order' => 6, 'active' => true]);
    $customType->states()->create(['status' => 'cancelled', 'step_order' => 7, 'active' => true]);

    $specimen = Specimen::create([
        'sequence_code' => 'CIT-0001-2026',
        'customer' => $this->customerA->id,
        'specimen_type' => $customType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'processing',
        'received_at' => now()->subDay(),
        'processing_at' => now(),
    ]);

    $response = $this->actingAs($this->customerA, 'customer')
        ->get(route('customer-portal.specimens.show', $specimen->sequence_code));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('customers/customer-portal/show')
        ->where('specimen.sequence_code', 'CIT-0001-2026')
        ->where('specimen.status_label', 'En Procesamiento')
        ->where('status_meta.key', 'processing')
        ->where('status_meta.label', 'En Procesamiento')
        ->where('status_meta.is_cancelled', false)
        // Timeline should only contain the 4 active sequential states: received, processing, finalized, delivered
        ->has('timeline_steps', 4)
        ->where('timeline_steps.0.key', 'received')
        ->where('timeline_steps.0.label', 'Recibida')
        ->where('timeline_steps.0.is_completed', true)
        ->where('timeline_steps.0.is_current', false)
        ->where('timeline_steps.1.key', 'processing')
        ->where('timeline_steps.1.label', 'En Procesamiento')
        ->where('timeline_steps.1.is_completed', false)
        ->where('timeline_steps.1.is_current', true)
        ->where('timeline_steps.2.key', 'finalized')
        ->where('timeline_steps.2.label', 'Finalizada')
        ->where('timeline_steps.2.is_completed', false)
        ->where('timeline_steps.2.is_current', false)
        ->where('timeline_steps.3.key', 'delivered')
        ->where('timeline_steps.3.label', 'Entregada')
        ->where('timeline_steps.3.is_completed', false)
        ->where('timeline_steps.3.is_current', false)
    );
});

test('customer portal show correctly handles cancelled specimen status', function () {
    $this->specimenA->update([
        'status' => 'cancelled',
        'cancelled_at' => now(),
        'cancellation_reason' => 'Muestra coagulada',
    ]);

    $response = $this->actingAs($this->customerA, 'customer')
        ->get(route('customer-portal.specimens.show', $this->specimenA->sequence_code));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('customers/customer-portal/show')
        ->where('specimen.sequence_code', $this->specimenA->sequence_code)
        ->where('status_meta.key', 'cancelled')
        ->where('status_meta.label', 'Cancelada')
        ->where('status_meta.is_cancelled', true)
    );
});
