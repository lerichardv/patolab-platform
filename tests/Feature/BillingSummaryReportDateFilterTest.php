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
use App\Models\SpecimenGroup;
use App\Models\SpecimenType;
use App\Models\SpecimenTypeExamination;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;

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

    $this->customer = Customer::factory()->create(['name' => 'Test Customer']);
    $this->location = Location::create([
        'name' => 'Main Lab',
        'address' => '123 Main St',
        'active' => true,
    ]);
    $this->specimenType = SpecimenType::create(['name' => 'Citología', 'active' => true]);
    $this->examination = SpecimenTypeExamination::create([
        'name' => 'Citología General',
        'active' => true,
        'specimen_type' => $this->specimenType->id,
    ]);
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
        'deadline' => '2027-12-31',
        'status' => 'active',
    ]);
});

test('billing report properly isolates august and september specimens using US and Latin date formats', function (string $fromParam, string $toParam) {
    // 1. Group Invoice with specimens from August and September
    $groupInvoice = Invoice::create([
        'full_invoice_number' => 'INV-GRP-001',
        'invoice_number' => '001',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'quantity' => 2,
        'amount' => 1000.00,
        'discount' => 0.00,
        'subtotal' => 1000.00,
        'total' => 1000.00,
        'is_group' => true,
        'invoice_type' => 'specimen',
        'invoice_file' => 'group_inv.pdf',
        'created_by_id' => $this->user->id,
    ]);
    $groupInvoice->forceFill(['created_at' => '2026-08-25 10:00:00'])->save();

    $group = SpecimenGroup::create([
        'name' => 'Group August-September',
        'customer_id' => $this->customer->id,
        'invoice_id' => $groupInvoice->id,
        'access_token' => 'token-test',
    ]);
    $groupInvoice->update(['group_id' => $group->id]);

    // August specimen
    $augSpecimen = Specimen::create([
        'sequence_code' => 'CIT-0001-08-2026',
        'customer' => $this->customer->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'status' => 'registered',
        'is_group' => true,
        'group_id' => $group->id,
    ]);
    $augSpecimen->forceFill(['created_at' => '2026-08-28 14:00:00'])->save();

    InvoiceSpecimen::create([
        'invoice_id' => $groupInvoice->id,
        'specimen_id' => $augSpecimen->id,
        'examination_id' => $this->examination->id,
        'quantity' => 1,
        'amount' => 500.00,
        'total' => 500.00,
        'subtotal' => 500.00,
        'is_paid' => true,
    ])->forceFill(['created_at' => '2026-08-28 14:00:00'])->save();

    // September specimen
    $septSpecimen = Specimen::create([
        'sequence_code' => 'CIT-0002-09-2026',
        'customer' => $this->customer->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'status' => 'registered',
        'is_group' => true,
        'group_id' => $group->id,
    ]);
    $septSpecimen->forceFill(['created_at' => '2026-09-05 10:00:00'])->save();

    InvoiceSpecimen::create([
        'invoice_id' => $groupInvoice->id,
        'specimen_id' => $septSpecimen->id,
        'examination_id' => $this->examination->id,
        'quantity' => 1,
        'amount' => 500.00,
        'total' => 500.00,
        'subtotal' => 500.00,
        'is_paid' => true,
    ])->forceFill(['created_at' => '2026-09-05 10:00:00'])->save();

    // 2. Individual August invoice
    $augInvoice = Invoice::create([
        'full_invoice_number' => 'INV-IND-001',
        'invoice_number' => '002',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 300.00,
        'discount' => 0.00,
        'subtotal' => 300.00,
        'total' => 300.00,
        'total_paid' => 300.00,
        'is_group' => false,
        'invoice_type' => 'specimen',
        'invoice_file' => 'aug_ind.pdf',
        'invoice_date' => '2026-08-15 12:00:00',
        'created_by_id' => $this->user->id,
    ]);
    $augInvoice->forceFill(['created_at' => '2026-08-15 12:00:00'])->save();

    // 3. Individual September invoice
    $septInvoice = Invoice::create([
        'full_invoice_number' => 'INV-IND-002',
        'invoice_number' => '003',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 400.00,
        'discount' => 0.00,
        'subtotal' => 400.00,
        'total' => 400.00,
        'total_paid' => 400.00,
        'is_group' => false,
        'invoice_type' => 'specimen',
        'invoice_file' => 'sept_ind.pdf',
        'invoice_date' => '2026-09-08 15:00:00',
        'created_by_id' => $this->user->id,
    ]);
    $septInvoice->forceFill(['created_at' => '2026-09-08 15:00:00'])->save();

    // Query Billing Summary Report with August range
    $response = $this->actingAs($this->user)->get(route('reports.billing-summary.index', [
        'date_from' => $fromParam,
        'date_to' => $toParam,
    ]));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('reports/billing-summary/index')
        ->has('activeInvoices.data', 2)
        ->where('filters.date_from', '2026-08-01')
        ->where('filters.date_to', '2026-08-31')
    );

    // Verify September specimens do NOT appear in the rows
    $activeRows = $response->viewData('page')['props']['activeInvoices']['data'];
    $codes = array_column($activeRows, 'specimen_code');
    expect($codes)->toContain('CIT-0001-08-2026')
        ->not->toContain('CIT-0002-09-2026');
})->with([
    'US format MM-DD-YYYY' => ['08-01-2026', '08-31-2026'],
    'Latin format DD-MM-YYYY' => ['01-08-2026', '31-08-2026'],
    'ISO format YYYY-MM-DD' => ['2026-08-01', '2026-08-31'],
]);

test('billing report properly isolates september specimens when filtering for september', function () {
    // 1. Group Invoice with specimens from August and September
    $groupInvoice = Invoice::create([
        'full_invoice_number' => 'INV-GRP-002',
        'invoice_number' => '011',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'credit',
        'quantity' => 2,
        'amount' => 1000.00,
        'discount' => 0.00,
        'subtotal' => 1000.00,
        'total' => 1000.00,
        'is_group' => true,
        'invoice_type' => 'specimen',
        'invoice_file' => 'group_inv2.pdf',
        'created_by_id' => $this->user->id,
    ]);
    $groupInvoice->forceFill(['created_at' => '2026-08-25 10:00:00'])->save();

    $group = SpecimenGroup::create([
        'name' => 'Group August-September 2',
        'customer_id' => $this->customer->id,
        'invoice_id' => $groupInvoice->id,
        'access_token' => 'token-test-2',
    ]);
    $groupInvoice->update(['group_id' => $group->id]);

    // August specimen
    $augSpecimen = Specimen::create([
        'sequence_code' => 'CIT-0010-08-2026',
        'customer' => $this->customer->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'status' => 'registered',
        'is_group' => true,
        'group_id' => $group->id,
    ]);
    $augSpecimen->forceFill(['created_at' => '2026-08-28 14:00:00'])->save();

    InvoiceSpecimen::create([
        'invoice_id' => $groupInvoice->id,
        'specimen_id' => $augSpecimen->id,
        'examination_id' => $this->examination->id,
        'quantity' => 1,
        'amount' => 500.00,
        'total' => 500.00,
        'subtotal' => 500.00,
        'is_paid' => true,
    ])->forceFill(['created_at' => '2026-08-28 14:00:00'])->save();

    // September specimen
    $septSpecimen = Specimen::create([
        'sequence_code' => 'CIT-0020-09-2026',
        'customer' => $this->customer->id,
        'specimen_category' => $this->category->id,
        'referrer' => $this->referrer->id,
        'priority_id' => $this->priority->id,
        'location_id' => $this->location->id,
        'specimen_type' => $this->specimenType->id,
        'status' => 'registered',
        'is_group' => true,
        'group_id' => $group->id,
    ]);
    $septSpecimen->forceFill(['created_at' => '2026-09-05 10:00:00'])->save();

    InvoiceSpecimen::create([
        'invoice_id' => $groupInvoice->id,
        'specimen_id' => $septSpecimen->id,
        'examination_id' => $this->examination->id,
        'quantity' => 1,
        'amount' => 500.00,
        'total' => 500.00,
        'subtotal' => 500.00,
        'is_paid' => true,
    ])->forceFill(['created_at' => '2026-09-05 10:00:00'])->save();

    // Query Billing Summary Report for September
    $response = $this->actingAs($this->user)->get(route('reports.billing-summary.index', [
        'date_from' => '09-01-2026',
        'date_to' => '09-30-2026',
    ]));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('reports/billing-summary/index')
        ->has('activeInvoices.data', 1)
        ->where('activeInvoices.data.0.specimen_code', 'CIT-0020-09-2026')
        ->where('filters.date_from', '2026-09-01')
        ->where('filters.date_to', '2026-09-30')
    );

    $activeRows = $response->viewData('page')['props']['activeInvoices']['data'];
    $codes = array_column($activeRows, 'specimen_code');
    expect($codes)->toContain('CIT-0020-09-2026')
        ->not->toContain('CIT-0010-08-2026');
});

test('billing report excel export filters by date range correctly', function () {
    $invoice = Invoice::create([
        'full_invoice_number' => 'INV-EXP-001',
        'invoice_number' => '099',
        'cai_range_id' => $this->caiRange->id,
        'customer_id' => $this->customer->id,
        'payment_type' => 'cash',
        'quantity' => 1,
        'amount' => 200.00,
        'discount' => 0.00,
        'subtotal' => 200.00,
        'total' => 200.00,
        'total_paid' => 200.00,
        'is_group' => false,
        'invoice_type' => 'specimen',
        'invoice_file' => 'exp.pdf',
        'created_by_id' => $this->user->id,
    ]);
    $invoice->forceFill(['created_at' => '2026-08-10 10:00:00'])->save();

    $response = $this->actingAs($this->user)->get(route('reports.billing-summary.export', [
        'date_from' => '08-01-2026',
        'date_to' => '08-31-2026',
    ]));

    $response->assertOk();
    expect($response->headers->get('content-type'))->toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});
