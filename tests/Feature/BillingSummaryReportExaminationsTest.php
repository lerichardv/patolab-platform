<?php

use App\Models\CaiRange;
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
use App\Models\SpecimenExamination;
use App\Models\SpecimenGroup;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

beforeEach(function () {
    $role = Role::create(['slug' => 'admin', 'name' => 'Administrador']);
    $viewPermission = Permission::create(['slug' => 'reports.billing_summary.view', 'name' => 'Ver Reporte de Facturación']);
    $role->permissions()->attach($viewPermission);

    $this->user = User::factory()->create([
        'name' => 'Admin User',
        'role_id' => $role->id,
        'active' => true,
    ]);

    Gate::define('reports.billing_summary.view', fn () => true);

    $this->customer = Customer::factory()->create(['name' => 'John Doe']);
    $this->location = Location::create([
        'name' => 'Main Lab',
        'address' => '123 Main St',
        'active' => true,
    ]);
    $this->specimenType = SpecimenType::create(['name' => 'Biopsia', 'active' => true]);
    $this->category = SpecimenCategory::create(['name' => 'General', 'quantity' => 1]);
    $this->priority = Priority::create(['name' => 'Normal', 'color' => '#3b82f6', 'order' => 1, 'active' => true]);

    $referrerType = ReferrerType::create(['name' => 'Tipo de Referente', 'active' => true]);
    $this->referrer = Referrer::create(['name' => 'Dr. Smith', 'referrer_type' => $referrerType->id, 'active' => true]);

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
        'deadline' => '2030-12-31',
        'status' => 'active',
    ]);

    $this->exam1 = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Biopsia Pequeña',
        'code' => 'BP',
        'active' => true,
    ]);

    $this->exam2 = SpecimenTypeExamination::create([
        'specimen_type' => $this->specimenType->id,
        'name' => 'Inmunohistoquímica',
        'code' => 'IHQ',
        'active' => true,
    ]);
});

test('billing summary row returns specimen_type and multiple examinations via SpecimenExamination', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-001',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ]);

    // Attach examinations via SpecimenExamination model
    SpecimenExamination::create([
        'specimen_id' => $specimen->id,
        'examination_id' => $this->exam1->id,
    ]);
    SpecimenExamination::create([
        'specimen_id' => $specimen->id,
        'examination_id' => $this->exam2->id,
    ]);

    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimen->id,
        'invoice_number' => '00001001',
        'invoice_prefix' => '000-001-01-',
        'full_invoice_number' => '000-001-01-00001001',
        'cai' => 'CAI-TEST',
        'invoice_type' => 'active',
        'payment_type' => 'cash',
        'is_group' => false,
        'total' => 1500,
        'total_paid' => 1500,
        'isv_15' => 0,
        'discount' => 0,
        'invoice_file' => '',
        'created_by_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('reports.billing-summary.index'));

    $response->assertOk();
    $page = $response->viewData('page');
    $activeInvoices = $page['props']['activeInvoices'];

    expect($activeInvoices['data'])->toHaveCount(1);
    $row = $activeInvoices['data'][0];

    expect($row['specimen_type'])->toBe('Biopsia');
    expect($row['examinations'])->toBe([
        ['name' => 'Biopsia Pequeña', 'quantity' => 1],
        ['name' => 'Inmunohistoquímica', 'quantity' => 1],
    ]);
    expect($row['service'])->toBe('Biopsia - Biopsia Pequeña, Inmunohistoquímica');
});

test('billing summary row supports legacy specimen_type_examination fallback', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-002',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_type_examination' => $this->exam1->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ]);

    Invoice::create([
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimen->id,
        'invoice_number' => '00001002',
        'invoice_prefix' => '000-001-01-',
        'full_invoice_number' => '000-001-01-00001002',
        'cai' => 'CAI-TEST',
        'invoice_type' => 'active',
        'payment_type' => 'cash',
        'is_group' => false,
        'total' => 800,
        'total_paid' => 800,
        'isv_15' => 0,
        'discount' => 0,
        'invoice_file' => '',
        'created_by_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('reports.billing-summary.index'));

    $response->assertOk();
    $page = $response->viewData('page');
    $row = $page['props']['activeInvoices']['data'][0];

    expect($row['specimen_type'])->toBe('Biopsia');
    expect($row['examinations'])->toBe([
        ['name' => 'Biopsia Pequeña', 'quantity' => 1],
    ]);
    expect($row['service'])->toBe('Biopsia - Biopsia Pequeña');
});

test('billing summary row handles non-specimen invoice properly', function () {
    Invoice::create([
        'customer_id' => $this->customer->id,
        'specimen_id' => null,
        'invoice_number' => '00001003',
        'invoice_prefix' => '000-001-01-',
        'full_invoice_number' => '000-001-01-00001003',
        'cai' => 'CAI-TEST',
        'invoice_type' => 'credit payment',
        'payment_type' => 'cash',
        'is_group' => false,
        'total' => 500,
        'total_paid' => 500,
        'isv_15' => 0,
        'discount' => 0,
        'invoice_file' => '',
        'created_by_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('reports.billing-summary.index'));

    $response->assertOk();
    $page = $response->viewData('page');
    $row = $page['props']['activeInvoices']['data'][0];

    expect($row['specimen_type'])->toBeNull();
    expect($row['examinations'])->toBe([]);
    expect($row['service'])->toBe('Abono de Crédito');
});

test('billing summary row handles group invoices with multiple examinations', function () {
    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'invoice_number' => '00001004',
        'invoice_prefix' => '000-001-01-',
        'full_invoice_number' => '000-001-01-00001004',
        'cai' => 'CAI-TEST',
        'invoice_type' => 'active',
        'payment_type' => 'cash',
        'is_group' => true,
        'total' => 2000,
        'total_paid' => 2000,
        'isv_15' => 0,
        'discount' => 0,
        'invoice_file' => '',
        'created_by_id' => $this->user->id,
    ]);

    $group = SpecimenGroup::create([
        'customer_id' => $this->customer->id,
        'name' => 'Grupo Test',
        'invoice_id' => $invoice->id,
        'access_token' => 'token-test',
    ]);
    $invoice->update(['group_id' => $group->id]);

    $specimen = Specimen::create([
        'sequence_code' => 'BIO-GRP-01',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'is_group' => true,
        'group_id' => $group->id,
    ]);

    SpecimenExamination::create([
        'specimen_id' => $specimen->id,
        'examination_id' => $this->exam1->id,
    ]);
    SpecimenExamination::create([
        'specimen_id' => $specimen->id,
        'examination_id' => $this->exam2->id,
    ]);

    InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen->id,
        'is_group' => true,
        'group_id' => $group->id,
        'quantity' => 1,
        'amount' => 2000,
        'total' => 2000,
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('reports.billing-summary.index'));

    $response->assertOk();
    $page = $response->viewData('page');
    $row = $page['props']['activeInvoices']['data'][0];

    expect($row['specimen_type'])->toBe('Biopsia');
    expect($row['examinations'])->toBe([
        ['name' => 'Biopsia Pequeña', 'quantity' => 1],
        ['name' => 'Inmunohistoquímica', 'quantity' => 1],
    ]);
    expect($row['service'])->toBe('Biopsia - Biopsia Pequeña, Inmunohistoquímica');
});

test('filtering by examination_id uses SpecimenExamination pivot model', function () {
    // Specimen A with exam1
    $specimenA = Specimen::create([
        'sequence_code' => 'BIO-FLT-01',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ]);
    SpecimenExamination::create([
        'specimen_id' => $specimenA->id,
        'examination_id' => $this->exam1->id,
    ]);

    Invoice::create([
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimenA->id,
        'invoice_number' => '00002001',
        'invoice_prefix' => '000-001-01-',
        'full_invoice_number' => '000-001-01-00002001',
        'cai' => 'CAI-TEST',
        'invoice_type' => 'active',
        'payment_type' => 'cash',
        'is_group' => false,
        'total' => 1000,
        'total_paid' => 1000,
        'isv_15' => 0,
        'discount' => 0,
        'invoice_file' => '',
        'created_by_id' => $this->user->id,
    ]);

    // Specimen B with exam2
    $specimenB = Specimen::create([
        'sequence_code' => 'BIO-FLT-02',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ]);
    SpecimenExamination::create([
        'specimen_id' => $specimenB->id,
        'examination_id' => $this->exam2->id,
    ]);

    Invoice::create([
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimenB->id,
        'invoice_number' => '00002002',
        'invoice_prefix' => '000-001-01-',
        'full_invoice_number' => '000-001-01-00002002',
        'cai' => 'CAI-TEST',
        'invoice_type' => 'active',
        'payment_type' => 'cash',
        'is_group' => false,
        'total' => 1200,
        'total_paid' => 1200,
        'isv_15' => 0,
        'discount' => 0,
        'invoice_file' => '',
        'created_by_id' => $this->user->id,
    ]);

    // Filter only exam2
    $response = $this->actingAs($this->user)
        ->get(route('reports.billing-summary.index', [
            'examination_id' => [$this->exam2->id],
        ]));

    $response->assertOk();
    $activeData = $response->viewData('page')['props']['activeInvoices']['data'];
    expect($activeData)->toHaveCount(1);
    expect($activeData[0]['specimen_code'])->toBe('BIO-FLT-02');
    expect($activeData[0]['examinations'])->toBe([
        ['name' => 'Inmunohistoquímica', 'quantity' => 1],
    ]);

    // Filter only exam1
    $response1 = $this->actingAs($this->user)
        ->get(route('reports.billing-summary.index', [
            'examination_id' => [$this->exam1->id],
        ]));

    $response1->assertOk();
    $activeData1 = $response1->viewData('page')['props']['activeInvoices']['data'];
    expect($activeData1)->toHaveCount(1);
    expect($activeData1[0]['specimen_code'])->toBe('BIO-FLT-01');
    expect($activeData1[0]['examinations'])->toBe([
        ['name' => 'Biopsia Pequeña', 'quantity' => 1],
    ]);
});

test('filtering by specimen_type_id filters specimens accurately', function () {
    $type2 = SpecimenType::create(['name' => 'Citología', 'active' => true]);
    $examCitologia = SpecimenTypeExamination::create([
        'specimen_type' => $type2->id,
        'name' => 'Pap Líquido',
        'active' => true,
    ]);

    $specimenBiopsia = Specimen::create([
        'sequence_code' => 'BIO-TYP-01',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ]);
    SpecimenExamination::create([
        'specimen_id' => $specimenBiopsia->id,
        'examination_id' => $this->exam1->id,
    ]);

    Invoice::create([
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimenBiopsia->id,
        'invoice_number' => '00003001',
        'invoice_prefix' => '000-001-01-',
        'full_invoice_number' => '000-001-01-00003001',
        'cai' => 'CAI-TEST',
        'invoice_type' => 'active',
        'payment_type' => 'cash',
        'is_group' => false,
        'total' => 500,
        'total_paid' => 500,
        'isv_15' => 0,
        'discount' => 0,
        'invoice_file' => '',
        'created_by_id' => $this->user->id,
    ]);

    $specimenCitologia = Specimen::create([
        'sequence_code' => 'CIT-TYP-01',
        'customer' => $this->customer->id,
        'specimen_type' => $type2->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ]);
    SpecimenExamination::create([
        'specimen_id' => $specimenCitologia->id,
        'examination_id' => $examCitologia->id,
    ]);

    Invoice::create([
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimenCitologia->id,
        'invoice_number' => '00003002',
        'invoice_prefix' => '000-001-01-',
        'full_invoice_number' => '000-001-01-00003002',
        'cai' => 'CAI-TEST',
        'invoice_type' => 'active',
        'payment_type' => 'cash',
        'is_group' => false,
        'total' => 600,
        'total_paid' => 600,
        'isv_15' => 0,
        'discount' => 0,
        'invoice_file' => '',
        'created_by_id' => $this->user->id,
    ]);

    // Filter by Citología only
    $response = $this->actingAs($this->user)
        ->get(route('reports.billing-summary.index', [
            'specimen_type_id' => [$type2->id],
        ]));

    $response->assertOk();
    $activeData = $response->viewData('page')['props']['activeInvoices']['data'];
    expect($activeData)->toHaveCount(1);
    expect($activeData[0]['specimen_code'])->toBe('CIT-TYP-01');
    expect($activeData[0]['specimen_type'])->toBe('Citología');
});

test('grouped invoice items are filtered according to selected examination', function () {
    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'invoice_number' => '00004001',
        'invoice_prefix' => '000-001-01-',
        'full_invoice_number' => '000-001-01-00004001',
        'cai' => 'CAI-TEST',
        'invoice_type' => 'active',
        'payment_type' => 'cash',
        'is_group' => true,
        'total' => 2000,
        'total_paid' => 2000,
        'isv_15' => 0,
        'discount' => 0,
        'invoice_file' => '',
        'created_by_id' => $this->user->id,
    ]);

    $group = SpecimenGroup::create([
        'customer_id' => $this->customer->id,
        'name' => 'Group Mix',
        'invoice_id' => $invoice->id,
        'access_token' => 'token-mix',
    ]);
    $invoice->update(['group_id' => $group->id]);

    // Item 1: exam1
    $specimen1 = Specimen::create([
        'sequence_code' => 'GRP-EXAM-01',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'is_group' => true,
        'group_id' => $group->id,
    ]);
    SpecimenExamination::create([
        'specimen_id' => $specimen1->id,
        'examination_id' => $this->exam1->id,
    ]);
    InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen1->id,
        'is_group' => true,
        'group_id' => $group->id,
        'quantity' => 1,
        'amount' => 800,
        'total' => 800,
    ]);

    // Item 2: exam2
    $specimen2 = Specimen::create([
        'sequence_code' => 'GRP-EXAM-02',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
        'is_group' => true,
        'group_id' => $group->id,
    ]);
    SpecimenExamination::create([
        'specimen_id' => $specimen2->id,
        'examination_id' => $this->exam2->id,
    ]);
    InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen2->id,
        'is_group' => true,
        'group_id' => $group->id,
        'quantity' => 1,
        'amount' => 1200,
        'total' => 1200,
    ]);

    // When filtering by exam1, only Item 1 should appear
    $response = $this->actingAs($this->user)
        ->get(route('reports.billing-summary.index', [
            'examination_id' => [$this->exam1->id],
        ]));

    $response->assertOk();
    $activeData = $response->viewData('page')['props']['activeInvoices']['data'];
    expect($activeData)->toHaveCount(1);
    expect($activeData[0]['specimen_code'])->toBe('GRP-EXAM-01');
    expect($activeData[0]['gross_amount'])->toEqual(800);
});

test('billing summary row gets examination quantities directly from InvoiceSpecimen records', function () {
    $specimen = Specimen::create([
        'sequence_code' => 'BIO-QTY-01',
        'customer' => $this->customer->id,
        'specimen_type' => $this->specimenType->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'status' => 'received',
    ]);

    $invoice = Invoice::create([
        'customer_id' => $this->customer->id,
        'specimen_id' => $specimen->id,
        'invoice_number' => '00005001',
        'invoice_prefix' => '000-001-01-',
        'full_invoice_number' => '000-001-01-00005001',
        'cai' => 'CAI-TEST',
        'invoice_type' => 'active',
        'payment_type' => 'cash',
        'is_group' => false,
        'quantity' => 5,
        'total' => 5000,
        'total_paid' => 5000,
        'isv_15' => 0,
        'discount' => 0,
        'invoice_file' => '',
        'created_by_id' => $this->user->id,
    ]);

    // Create InvoiceSpecimen with specific quantities for each examination
    InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen->id,
        'examination_id' => $this->exam1->id,
        'quantity' => 3,
        'amount' => 1000,
        'total' => 3000,
    ]);

    InvoiceSpecimen::create([
        'invoice_id' => $invoice->id,
        'specimen_id' => $specimen->id,
        'examination_id' => $this->exam2->id,
        'quantity' => 2,
        'amount' => 1000,
        'total' => 2000,
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('reports.billing-summary.index'));

    $response->assertOk();
    $page = $response->viewData('page');
    $row = $page['props']['activeInvoices']['data'][0];

    expect($row['specimen_type'])->toBe('Biopsia');
    expect($row['examinations'])->toBe([
        ['name' => 'Biopsia Pequeña', 'quantity' => 3],
        ['name' => 'Inmunohistoquímica', 'quantity' => 2],
    ]);
    expect($row['quantity'])->toBe(5);
});
