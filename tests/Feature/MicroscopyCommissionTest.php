<?php

use App\Models\CaiRange;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\Priority;
use App\Models\Referrer;
use App\Models\Role;
use App\Models\Specimen;
use App\Models\SpecimenCategory;
use App\Models\SpecimenReport;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use App\Models\UserCommission;
use App\Models\UserCommissionRule;
use App\Services\ReportPdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // 1. Create a dummy role
    $this->role = Role::create([
        'name' => 'Pathologist',
        'slug' => 'pathologist',
    ]);

    // 2. Create two pathologist users with signatures
    $this->pathologist1 = User::create([
        'name' => 'Pathologist A',
        'email' => 'path1@patolab.test',
        'password' => bcrypt('password'),
        'role_id' => $this->role->id,
        'user_signature' => 'signatures/path1.png',
        'active' => true,
    ]);

    $this->pathologist2 = User::create([
        'name' => 'Pathologist B',
        'email' => 'path2@patolab.test',
        'password' => bcrypt('password'),
        'role_id' => $this->role->id,
        'user_signature' => 'signatures/path2.png',
        'active' => true,
    ]);

    // 3. Create basic specimen dependencies
    $this->customer = Customer::create([
        'name' => 'John Doe',
        'id_number' => '0801-1990-12345',
        'phone' => '9999-9999',
        'gender' => 'Hombre',
        'state' => 'Francisco Morazan',
        'city' => 'Tegucigalpa',
        'type' => 'cliente',
    ]);

    $this->specimenType = SpecimenType::create([
        'name' => 'Biopsy',
        'active' => true,
    ]);

    $this->examination = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Stomach Biopsy',
        'description' => 'Test Stomach Biopsy',
        'active' => true,
    ]);

    $this->category = SpecimenCategory::create([
        'name' => 'Routine',
        'unit' => 'days',
        'quantity' => 5,
        'active' => true,
    ]);

    $this->referrer = Referrer::create([
        'name' => 'Dr. House',
        'referrer_type' => 'médico',
        'active' => true,
    ]);

    // Create location and CAI range for invoice
    $this->location = Location::create(['name' => 'Main Location']);
    $this->caiRange = CaiRange::create([
        'location_id' => $this->location->id,
        'cai' => 'ABC-123',
        'full_prefix' => '000-001-01-',
        'emission' => '000',
        'establishment' => '001',
        'document_type' => '01',
        'start_number' => 1,
        'end_number' => 100,
        'last_used_number' => 0,
        'deadline' => now()->addYear(),
        'status' => 'active',
    ]);

    $this->priority = Priority::create([
        'name' => 'Routine',
        'color' => '#ffffff',
        'order' => 1,
    ]);

    // Mock ReportPdfService to avoid launching puppeteer
    $mock = Mockery::mock(ReportPdfService::class);
    $mock->shouldReceive('generateAndStoreReport')->andReturn('reports/test.pdf');
    $this->app->instance(ReportPdfService::class, $mock);
});

test('microscopy commission is divided by count of pathologists in microscopy', function () {
    // 1. Setup commission rules
    // Pathologist A: Fixed $100 microscopy commission
    $ruleA = UserCommissionRule::create([
        'user_id' => $this->pathologist1->id,
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $this->examination->id,
        'microscopy_commission_enabled' => true,
        'microscopy_calculation_type' => 'fixed',
        'microscopy_commission_value' => 100.00,
        'macroscopy_commission_enabled' => false,
    ]);

    // Pathologist B: Percentage (10%) microscopy commission
    $ruleB = UserCommissionRule::create([
        'user_id' => $this->pathologist2->id,
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $this->examination->id,
        'microscopy_commission_enabled' => true,
        'microscopy_calculation_type' => 'percentage',
        'microscopy_commission_value' => 10.00,
        'macroscopy_commission_enabled' => false,
    ]);

    // 2. Create Specimen
    $report = SpecimenReport::create([
        'report_date' => now(),
    ]);

    $specimen = Specimen::create([
        'sequence_code' => 'TEST-0001',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'anatomic_site' => 'Gastric',
        'status' => 'microscopic_review',
        'active' => true,
        'report_id' => $report->id,
        'priority_id' => $this->priority->id,
    ]);

    // 3. Create Invoice
    $invoice = Invoice::create([
        'specimen_id' => $specimen->id,
        'customer_id' => $this->customer->id,
        'cai_range_id' => $this->caiRange->id,
        'total' => 500.00,
        'amount' => 500.00,
        'subtotal' => 500.00,
        'full_invoice_number' => '001-001-01-00000001',
        'invoice_number' => 1,
        'payment_type' => 'cash',
        'quantity' => 1,
        'invoice_file' => 'invoices/test.pdf',
    ]);

    // 4. Assign both pathologists to the specimen with microscopy access
    $specimen->users()->attach($this->pathologist1->id, [
        'macroscopy_access' => false,
        'microscopy_access' => true,
    ]);
    $specimen->users()->attach($this->pathologist2->id, [
        'macroscopy_access' => false,
        'microscopy_access' => true,
    ]);

    // 5. Finalize the report
    $response = $this->actingAs($this->pathologist1)
        ->post(route('specimens.report-editor.transition-state', $specimen->sequence_code), [
            'status' => 'finalized',
        ]);

    $response->assertRedirect();

    // 6. Assert commissions are generated and divided by 2
    // Pathologist A: expected fixed $100 / 2 = $50.00
    // Pathologist B: expected 10% of $500 / 2 = $25.00
    $commissionA = UserCommission::where('user_id', $this->pathologist1->id)
        ->where('specimen_id', $specimen->id)
        ->where('phase', 'microscopy')
        ->first();

    $commissionB = UserCommission::where('user_id', $this->pathologist2->id)
        ->where('specimen_id', $specimen->id)
        ->where('phase', 'microscopy')
        ->first();

    expect($commissionA)->not->toBeNull();
    expect((float) $commissionA->calculated_comission_amount)->toBe(50.00);

    expect($commissionB)->not->toBeNull();
    expect((float) $commissionB->calculated_comission_amount)->toBe(25.00);
});

test('microscopy commission is NOT divided if only one pathologist has microscopy access', function () {
    // 1. Setup commission rule for Pathologist A
    $ruleA = UserCommissionRule::create([
        'user_id' => $this->pathologist1->id,
        'specimen_type_id' => $this->specimenType->id,
        'specimen_type_examination_id' => $this->examination->id,
        'microscopy_commission_enabled' => true,
        'microscopy_calculation_type' => 'fixed',
        'microscopy_commission_value' => 100.00,
        'macroscopy_commission_enabled' => false,
    ]);

    // 2. Create Specimen & Invoice
    $report = SpecimenReport::create([
        'report_date' => now(),
    ]);

    $specimen = Specimen::create([
        'sequence_code' => 'TEST-0002',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->examination->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'anatomic_site' => 'Gastric',
        'status' => 'microscopic_review',
        'active' => true,
        'report_id' => $report->id,
        'priority_id' => $this->priority->id,
    ]);

    $invoice = Invoice::create([
        'specimen_id' => $specimen->id,
        'customer_id' => $this->customer->id,
        'cai_range_id' => $this->caiRange->id,
        'total' => 500.00,
        'amount' => 500.00,
        'subtotal' => 500.00,
        'full_invoice_number' => '001-001-01-00000002',
        'invoice_number' => 2,
        'payment_type' => 'cash',
        'quantity' => 1,
        'invoice_file' => 'invoices/test.pdf',
    ]);

    // 3. Assign only Pathologist A with microscopy access, and Pathologist B with ONLY macroscopy access
    $specimen->users()->attach($this->pathologist1->id, [
        'macroscopy_access' => false,
        'microscopy_access' => true,
    ]);
    $specimen->users()->attach($this->pathologist2->id, [
        'macroscopy_access' => true,
        'microscopy_access' => false,
    ]);

    // 4. Finalize report
    $response = $this->actingAs($this->pathologist1)
        ->post(route('specimens.report-editor.transition-state', $specimen->sequence_code), [
            'status' => 'finalized',
        ]);

    $response->assertRedirect();

    // 5. Assert Pathologist A's commission is not divided
    $commissionA = UserCommission::where('user_id', $this->pathologist1->id)
        ->where('specimen_id', $specimen->id)
        ->where('phase', 'microscopy')
        ->first();

    expect($commissionA)->not->toBeNull();
    expect((float) $commissionA->calculated_comission_amount)->toBe(100.00);
});
